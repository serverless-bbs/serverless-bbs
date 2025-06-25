import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import File from 'lucide-react/dist/esm/icons/file';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';

interface Thread {
  id: number;
  title: string;
  author_id: number;
  author_username: string;
  created_at: number;
  reply_count: number;
  view_count: number;
  last_reply_id: number;
  last_reply_at: number | null;
  last_reply_username: string | null;
  last_reply_user_id: string | null;
  is_pinned?: boolean;
}

interface Node {
  id: number;
  name: string;
  description: string;
}

export default function NodePage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [node, setNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nodeId) return;
    const fetchThreadsAndNode = async () => {
      try {
        const [threadData, nodeData] = await Promise.all([
          apiClient.get<Thread[]>(`/threads?nodeId=${nodeId}`),
          apiClient.get<Node>(`/nodes/${nodeId}`)
        ]);
        setThreads(threadData);
        setNode(nodeData);
      } catch (error) {
        console.error('Failed to fetch threads:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchThreadsAndNode();
  }, [nodeId]);

  if (loading) {
    return <div className="max-w-[960px] mx-auto text-center py-10">正在加载...</div>;
  }

  if (!node) {
    return <div className="max-w-[960px] mx-auto text-center py-10">版块未找到。</div>
  }

  return (
    <div className="max-w-[960px] mx-auto w-full space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl font-bold">{node.name}</h1>
        <Button className="bg-[#336699] hover:bg-[#2366A8] text-white rounded-sm text-sm px-4 h-8" onClick={() => navigate(isAuthenticated ? `/nodes/${nodeId}/new` : '/auth')}>
          发帖
        </Button>
      </div>

      <div className="bg-white border border-[#CDCDCD] rounded-sm">
        <div className="bg-[#F5FAFE] border-b border-[#E5EDF2] px-4 py-2 flex text-sm font-bold text-gray-600">
          <div className="w-full pl-4">标题</div>
          <div className="w-32 shrink-0 text-left">作者</div>
          <div className="w-24 shrink-0 text-center">回复/查看</div>
          <div className="w-40 shrink-0 text-right">最后发表</div>
        </div>

        <div className="divide-y divide-[#E5EDF2]">
          {threads.map(thread => (
            <div key={thread.id} className="p-1 flex items-center text-sm">
              <div className="w-full flex items-center">
                {
                  thread.is_pinned ? 
                  <Lightbulb className='mr-1 h-[18px] text-gray-300' />
                  :
                  <File className='mr-1 h-[18px] text-gray-300' />
                }
                <Link to={`/threads/${thread.id}`} className="text-black hover:text-[#336699] hover:underline">
                  {thread.title}
                </Link>
              </div>
              <div className="w-32 shrink-0 text-left text-xs">
                <Link to={`/users/${thread.author_id}`} className="text-[#336699]">{thread.author_username}</Link>
                <Link to={`/threads/${thread.id}`} className="block text-gray-400 hover:underline">{formatDistanceToNow(new Date(thread.created_at * 1000), { addSuffix: true, locale: zhCN })}</Link>
              </div>
              <div className="w-24 shrink-0 text-center text-xs">
                <span className="text-red-500">{thread.reply_count}</span>
                <span className="text-gray-400"> / {thread.view_count}</span>
              </div>
              <div className="w-40 shrink-0 text-right text-xs">
                {thread.last_reply_at ? (
                  <>
                    <Link to={`/users/${thread.last_reply_user_id}`} className="block text-[#336699]">{thread.last_reply_username}</Link>
                    <Link to={`/threads/${thread.id}#reply-${thread.last_reply_id}`} className="block text-gray-400 hover:underline">{formatDistanceToNow(new Date(thread.last_reply_at * 1000), { addSuffix: true, locale: zhCN })}</Link>
                  </>
                ) : (
                  <span className="text-gray-400">暂无</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
