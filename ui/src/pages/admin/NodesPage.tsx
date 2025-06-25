import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import { Link } from 'react-router-dom';

interface Node {
  id: number | string; // 使用联合类型以区分新旧
  name: string;
  sort_order: number;
  parent_node_id: number | null;
}

const NodesPage = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const { toast } = useToast();

  const fetchNodes = async () => {
    const data = await apiClient.get<Node[]>('/admin/nodes');
    setNodes(data || []);
  };

  useEffect(() => { fetchNodes(); }, []);

  const handleNodeChange = (id: number | string, field: 'name' | 'sort_order', value: string | number) => {
    setNodes(currentNodes =>
      currentNodes.map(node =>
        node.id === id ? { ...node, [field]: value } : node
      )
    );
  };

  const addCategory = () => {
    const newCategory: Node = {
      id: `new_cat_${Date.now()}`,
      name: '新分类',
      sort_order: (nodes.filter(n => !n.parent_node_id).length + 1) * 10,
      parent_node_id: null,
    };
    setNodes(currentNodes => [...currentNodes, newCategory]);
  };

  const addSubNode = (parentId: number) => {
    const newSubNode: Node = {
      id: `new_sub_${Date.now()}`,
      name: '新版块',
      sort_order: (nodes.filter(n => n.parent_node_id === parentId).length + 1) * 10,
      parent_node_id: parentId,
    };
    setNodes(currentNodes => [...currentNodes, newSubNode]);
  };

  const deleteNode = async (id: number | string) => {
    if (typeof id === 'string') { // 新增的节点，直接从 state 移除
      setNodes(currentNodes => currentNodes.filter(n => n.id !== id));
    } else { // 已存在的节点，调用 API
      if (window.confirm("确定要删除这个版块吗？其下的子版块将会成为顶级分类。")) {
        try {
          await apiClient.delete(`/admin/nodes/${id}`);
          toast({ title: "成功", description: "版块已删除。" });
          fetchNodes();
        } catch (error: any) {
          toast({ title: "错误", description: `删除失败: ${error.message}`, variant: "destructive" });
        }
      }
    }
  };

  const handleSubmit = async () => {
    try {
      await apiClient.put('/admin/nodes', { nodes });
      toast({ title: "成功", description: "版块结构已保存。" });
      fetchNodes(); // 重新获取数据以获得新的 ID
    } catch (error: any) {
      toast({ title: "错误", description: `保存失败: ${error.message}`, variant: "destructive" });
    }
  };

  const categories = nodes.filter(n => !n.parent_node_id);

  return (
    <AdminLayout>
      <div>

        <div className="flex border-b border-gray-300 mb-[19px]">
          <Link to="/admin/setting" className="px-0 mr-5 pt-0 py-2 text-[14px] text-gray-600 hover:text-[#336699]">站点设置</Link>
          <div className="px-0 mr-5 pt-0 py-2 text-[14px] font-bold text-[#336699] border-b-2 border-[#336699] -mb-px">版块管理</div>
        </div>

        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat.id}>
              <div className="flex items-center space-x-2 bg-gray-100 p-2 border rounded-t-sm">
                <GripVertical className="cursor-move text-gray-400" />
                <Input className="w-16 h-7 text-center" value={cat.sort_order} onChange={e => handleNodeChange(cat.id, 'sort_order', parseInt(e.target.value) || 0)} />
                <Input className="flex-grow h-7 font-bold" value={cat.name} onChange={e => handleNodeChange(cat.id, 'name', e.target.value)} />
                <Button variant="ghost" size="sm" onClick={() => addSubNode(cat.id as number)}>添加子版块</Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteNode(cat.id)}>删除</Button>
              </div>
              <div className="border border-t-0 rounded-b-sm pl-12 pr-4 py-2 space-y-2">
                {nodes.filter(n => n.parent_node_id === cat.id).map(sub => (
                  <div key={sub.id} className="flex items-center space-x-2">
                    <GripVertical className="cursor-move text-gray-400" />
                    <Input className="w-16 h-7 text-center" value={sub.sort_order} onChange={e => handleNodeChange(sub.id, 'sort_order', parseInt(e.target.value) || 0)} />
                    <Input className="flex-grow h-7" value={sub.name} onChange={e => handleNodeChange(sub.id, 'name', e.target.value)} />
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteNode(sub.id)}>删除</Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t pt-4 space-x-4">
          <Button onClick={handleSubmit}>提交</Button>
          <Button variant="outline" onClick={addCategory}>添加新分类</Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NodesPage;
