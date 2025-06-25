import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { Link, useSearchParams } from 'react-router-dom';
import Pin from 'lucide-react/dist/esm/icons/pin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Node } from '@/../../worker/src/types';

interface AdminThread {
  id: number;
  title: string;
  author: string;
  author_id: string;
  created_at: number;
  reply_count: number;
  view_count: number;
  is_pinned: number;
  node_name: string;
  node_id: number;
}

// --- 子组件：移动帖子的模态框 ---
const MoveThreadsModal = ({ onConfirm, onCancel, nodes }: { onConfirm: (targetNodeId: string) => void, onCancel: () => void, nodes: Node[] }) => {
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-sm shadow-lg w-full max-w-md">
        <div className="p-4 border-b font-bold text-gray-700">移动帖子</div>
        <div className="p-6 space-y-4">
          <label className="text-sm">选择目标版块</label>
          <Select onValueChange={setTargetNodeId}>
            <SelectTrigger>
              <SelectValue placeholder="请选择版块..." />
            </SelectTrigger>
            <SelectContent>{nodes.map(node => <SelectItem key={node.id} value={String(node.id)}>{node.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="p-4 border-t flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={() => onConfirm(targetNodeId)} disabled={!targetNodeId}>确认移动</Button>
        </div>
      </div>
    </div>
  );
};

const ContentPage = () => {
  const [threads, setThreads] = useState<AdminThread[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState({
    keyword: '',
    author: searchParams.get('author') || '' // 修复：从 URL 参数初始化作者搜索
  });
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchThreads = useCallback(async () => {
    const searchToUse = {
      keyword: search.keyword,
      author: search.author,
    };
    // 移除空的搜索参数以避免发送空查询
    const params = new URLSearchParams(Object.fromEntries(Object.entries(searchToUse).filter(([_, v]) => v))).toString();
    const data = await apiClient.get<AdminThread[]>(`/admin/threads?${params}`);
    setThreads(data || []);
  }, [search]);

  const fetchNodes = useCallback(async () => {
    const data = await apiClient.get<Node[]>('/nodes');
    setNodes(data.filter(node => !!node.parent_node_id) || []);
  }, []);

  useEffect(() => {
    fetchThreads();
    fetchNodes();
  }, [fetchThreads, fetchNodes]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) { setSelectedIds(threads.map(t => t.id)); }
    else { setSelectedIds([]); }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleBatchAction = async (action: 'pin' | 'unpin' | 'delete' | 'move', targetNodeId?: number) => {
    if (selectedIds.length === 0) { toast({ title: "提示", description: "请至少选择一个帖子。" }); return; }
    try {
      let res;
      if (action === 'delete') res = await apiClient.delete(`/admin/threads`, { ids: selectedIds }) as any;
      else if (action === 'move') res = await apiClient.put('/admin/threads/move', { ids: selectedIds, targetNodeId }) as any;
      else res = await apiClient.put('/admin/threads/pin', { ids: selectedIds, isPinned: action === 'pin' }) as any;
      toast({ title: "成功", description: res.message });
      setSelectedIds([]);
      fetchThreads();
    } catch (error: any) {
      toast({ title: "错误", description: `操作失败: ${error.message}`, variant: "destructive" });
    }
  };

  const isAllSelected = selectedIds.length > 0 && selectedIds.length === threads.length;
  const isPartialSelected = selectedIds.length > 0 && selectedIds.length < threads.length;

  return (
    <AdminLayout>
      {isMoveModalOpen && <MoveThreadsModal nodes={nodes} onCancel={() => setIsMoveModalOpen(false)} onConfirm={(target: string) => { handleBatchAction('move', parseInt(target)); setIsMoveModalOpen(false); }} />}
      <div className="flex border-b border-gray-300 mb-[19px]">
        <div className="px-0 mr-5 pt-0 py-2 text-[14px] font-bold text-[#336699] border-b-2 border-[#336699] -mb-px">帖子管理</div>
        <Link to="/admin/content/replies" className="px-0 mr-5 pt-0 py-2 text-[14px] text-gray-600 hover:text-[#336699]">回帖管理</Link>
      </div>
      <div className="bg-gray-50 p-2 mb-6 text-sm text-gray-600 border rounded-sm">
        <p>提示：搜索支持通配符 *，多个用户名之间用英文半角逗号“,”分隔。</p>
      </div>
      <div className="flex space-x-4 mb-4 items-center">
        <Input placeholder="关键词" value={search.keyword} onChange={e => setSearch({ ...search, keyword: e.target.value })} />
        <Input placeholder="作者" value={search.author} onChange={e => setSearch({ ...search, author: e.target.value })} />
        <Button onClick={fetchThreads}>搜索</Button>
      </div>
      <div className="mb-4">
        <Button variant="outline" size="sm" onClick={() => handleBatchAction('pin')}>置顶</Button>
        <Button variant="outline" size="sm" onClick={() => setIsMoveModalOpen(true)}>移动</Button>
        <Button variant="outline" size="sm" className="ml-2" onClick={() => handleBatchAction('unpin')}>取消置顶</Button>
        <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleBatchAction('delete')} disabled={selectedIds.length === 0}>删除选中</Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 w-10">
              <Checkbox onCheckedChange={handleSelectAll} checked={isAllSelected ? true : (isPartialSelected ? 'indeterminate' : false)} />
            </th>
            <th className="p-2">标题</th>
            <th className="p-2 w-32">作者</th>
            <th className="p-2 w-32">所属版块</th>
            <th className="p-2 w-40">发表时间</th>
            <th className="p-2 w-24">回复/查看</th>
          </tr>
        </thead>
        <tbody>
          {threads.map(thread => (
            <tr key={thread.id} className="border-b">
              <td className="p-2">
                <Checkbox checked={selectedIds.includes(thread.id)} onCheckedChange={(checked) => handleSelectOne(thread.id, !!checked)} />
              </td>
              <td className="p-2 flex items-center">{!!thread.is_pinned && <Pin className="w-4 h-4 text-orange-500 mr-2 shrink-0" />}<Link to={`/threads/${thread.id}`} className="text-blue-600 hover:underline truncate">{thread.title}</Link>
              </td>
              <td className="p-2">
                <Link to={`/admin/users?uid=${thread.author_id}`} className="text-blue-600 hover:underline">{thread.author}</Link>
              </td>
              <td className="p-2">
                <Link to={`/nodes/${thread.node_id}`} className="text-blue-600 hover:underline">{thread.node_name}</Link>
              </td>
              <td className="p-2">{format(new Date(thread.created_at * 1000), 'yyyy-MM-dd HH:mm')}</td>
              <td className="p-2">{thread.reply_count} / {thread.view_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
};

export default ContentPage;
