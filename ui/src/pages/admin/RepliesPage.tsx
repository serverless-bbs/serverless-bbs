import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { Link, useSearchParams } from 'react-router-dom';

interface AdminReply { id: number; body: string; created_at: number; author: string; author_id: string; thread_id: number; thread_title: string; node_id: number; node_name: string; }

const RepliesPage = () => {
  const [replies, setReplies] = useState<AdminReply[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState({
    keyword: '',
    author: searchParams.get('author') || '' // 修复：从 URL 参数初始化作者搜索
  });
  const { toast } = useToast();

  const fetchReplies = useCallback(async () => {
    const searchToUse = {
      keyword: search.keyword,
      author: search.author,
    };
    const params = new URLSearchParams(Object.fromEntries(Object.entries(searchToUse).filter(([_, v]) => v))).toString();
    const data = await apiClient.get<AdminReply[]>(`/admin/replies?${params}`);
    setReplies(data || []);
  }, [search]);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) { setSelectedIds(replies.map(r => r.id)); }
    else { setSelectedIds([]); }
  };
  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await apiClient.delete('/admin/replies', { ids: selectedIds });
      toast({ title: "成功", description: "选中的回帖已删除。" });
      setSelectedIds([]);
      fetchReplies();
    } catch (error: any) { toast({ title: "错误", description: `删除失败: ${error.message}`, variant: "destructive" }); }
  };

  const isAllSelected = selectedIds.length > 0 && selectedIds.length === replies.length;
  const isPartialSelected = selectedIds.length > 0 && selectedIds.length < replies.length;

  return (
    <AdminLayout>
      <div className="flex border-b border-gray-300 mb-[19px]">
        <Link to="/admin/content/threads" className="px-0 mr-5 pt-0 py-2 text-[14px] text-gray-600 hover:text-[#336699]">帖子管理</Link>
        <div className="px-0 mr-5 pt-0 py-2 text-[14px] font-bold text-[#336699] border-b-2 border-[#336699] -mb-px">回帖管理</div>
      </div>
      <div className="bg-gray-50 p-2 mb-6 text-sm text-gray-600 border rounded-sm">
        <p>提示：搜索支持通配符 *，多个用户名之间用英文半角逗号“,”分隔。</p>
      </div>
      <div className="flex space-x-4 mb-4 items-center">
        <Input placeholder="内容包含" value={search.keyword} onChange={e => setSearch({ ...search, keyword: e.target.value })} />
        <Input placeholder="作者" value={search.author} onChange={e => setSearch({ ...search, author: e.target.value })} />
        <Button onClick={fetchReplies}>搜索</Button>
      </div>
      <div className="mb-4 flex space-x-2">
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={selectedIds.length === 0}>删除选中</Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 w-10">
              <Checkbox onCheckedChange={handleSelectAll} checked={isAllSelected ? true : (isPartialSelected ? 'indeterminate' : false)} />
            </th>
            <th className="p-2">内容</th>
            <th className="p-2 w-32">作者</th>
            <th className="p-2 w-48">版块</th>
            <th className="p-2 w-48">所在主题</th>
            <th className="p-2 w-40">发表时间</th>
          </tr>
        </thead>
        <tbody>
          {replies.map(reply => (
            <tr key={reply.id} className="border-b">
              <td className="p-2">
                <Checkbox checked={selectedIds.includes(reply.id)} onCheckedChange={(c) => handleSelectOne(reply.id, !!c)} />
              </td>
              <td className="p-2">
                <Link to={`/threads/${reply.thread_id}#reply-${reply.id}`} className="text-blue-600 hover:underline" dangerouslySetInnerHTML={{ __html: reply.body.substring(0, 50) + '...' }} />
              </td>
              <td className="p-2">
                <Link to={`/admin/users?uid=${reply.author_id}`} className="text-blue-600 hover:underline">{reply.author}</Link>
              </td>
              <td className="p-2">
                <Link to={`/nodes/${reply.node_id}`} className="text-blue-600 hover:underline truncate">{reply.node_name}</Link>
              </td>
              <td className="p-2">
                <Link to={`/threads/${reply.thread_id}`} className="text-blue-600 hover:underline truncate">{reply.thread_title}</Link>
              </td>
              <td className="p-2">{format(new Date(reply.created_at * 1000), 'yyyy-MM-dd HH:mm')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
};

export default RepliesPage;
