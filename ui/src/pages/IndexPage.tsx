import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';

// 更新前端的 Node 类型以匹配后端响应
interface Node {
  id: number;
  name: string;
  description: string | null;
  parent_node_id: number | null;
  thread_count: number;
  reply_count: number;
  last_post_title: string | null;
  last_post_thread_id: number | null;
  last_post_time: number | null;
}

export default function IndexPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const data = await apiClient.get<Node[]>('/nodes');
        setNodes(data);
      } catch (error) {
        console.error('Failed to fetch nodes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNodes();
  }, []);

  if (loading) {
    return <div className="max-w-[960px] mx-auto text-center py-10">正在加载...</div>;
  }

  const nodeTree: Record<string, { parent: Node; children: Node[] }> = {};
  const parentNodes: Node[] = [];

  if (!nodes || !nodes.length) {
    return <div>Empty</div>
  }
  nodes.forEach(node => {
    if (!node.parent_node_id) {
      parentNodes.push(node);
      if (!nodeTree[node.id]) {
        nodeTree[node.id] = { parent: node, children: [] };
      } else {
        nodeTree[node.id].parent = node;
      }
    } else {
      if (nodeTree[node.parent_node_id]) {
        nodeTree[node.parent_node_id].children.push(node);
      }
    }
  });

  return (
    <div className="max-w-[960px] mx-auto w-full space-y-4">
      {parentNodes.map(parent => (
        <div key={parent.id} className="bg-white border border-[#CDCDCD] rounded-sm">
          <h2 className="bg-[#F5FAFE] border-b border-discuz-gray px-4 py-2 text-sm font-bold text-[#336699]">{parent.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {(nodeTree[parent.id]?.children || []).map((child, index) => (
              <div
                key={child.id}
                className={`flex items-start p-3 border-t border-dashed border-discuz-gray 
                        ${index < 2 ? 'md:border-t-0' : ''} 
                        ${index % 2 === 0 ? 'md:border-r md:border-solid' : ''}`}
              >
                <div className="mr-3 shrink-0 mt-1">
                  <MessageCircle className='mr-2 text-gray-300 w-[40px] h-[40px]' />
                </div>
                <div className="flex-grow">
                  <h3 className="text-sm">
                    <Link to={`/nodes/${child.id}`} className="text-[#333] text-sm font-bold hover:underline">{child.name}</Link>
                    {child.thread_count > 0 && <span className="text-red-500 font-normal text-xs ml-1">(今日: {Math.floor(child.thread_count / 10)})</span>}
                  </h3>
                  <div className="text-xs text-[#333] mt-1">
                    <span>主题: <span className="">{child.thread_count}</span>,</span>
                    <span className="ml-2">帖数: <span className="">{child.reply_count}</span></span>
                  </div>
                  <div className="text-xs text-[#333] mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    最后发表:
                    {child.last_post_title ? (
                      <>
                        <Link to={`/threads/${child.last_post_thread_id}`} className="text-[#333] ml-1">{child.last_post_title.substring(0, 18) + '...'}</Link>
                        {child.last_post_time && <span className="ml-2">{format(new Date(child.last_post_time * 1000), 'yyyy-MM-dd')}</span>}
                      </>
                    ) : (
                      <span className="ml-1">从未</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
