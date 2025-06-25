import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import Pen from 'lucide-react/dist/esm/icons/pen';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { Link } from 'react-router-dom';

interface UserGroup {
  id?: number;
  level_id: number;
  name: string;
  icon: string | null;
  points_required: number;
}

const UserGroupsPage = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const { toast } = useToast();

  const fetchGroups = async () => {
    const data = await apiClient.get<UserGroup[]>('/admin/groups');
    setGroups(data || []);
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleGroupChange = (index: number, field: keyof UserGroup, value: string | number) => {
    const newGroups = [...groups];
    (newGroups[index] as any)[field] = value;
    setGroups(newGroups);
  };

  const addGroup = () => {
    const newId = Math.max(...groups.map(g => g.level_id), 0) + 1;
    setGroups([...groups, {
      level_id: newId,
      name: '新用户组',
      icon: '★',
      points_required: (Math.max(...groups.map(g => g.points_required), 0) + 100)
    }]);
  };

  const deleteGroup = async (group: UserGroup, index: number) => {
    if (group.id) { // 已存在的组，调用API
      if (window.confirm(`确定删除用户组 "${group.name}" 吗？`)) {
        try {
          await apiClient.delete(`/admin/groups/${group.id}`);
          toast({ title: "成功", description: "用户组已删除。" });
          fetchGroups();
        } catch (error: any) {
          toast({ title: "错误", description: `删除失败: ${error.message}`, variant: "destructive" });
        }
      }
    } else { // 新增的组，直接从state移除
      setGroups(groups.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    try {
      await apiClient.put('/admin/groups', { groups });
      toast({ title: "成功", description: "用户组设置已保存。" });
      fetchGroups();
    } catch (error: any) {
      toast({ title: "错误", description: `保存失败: ${error.message}`, variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="bg-white p-6 border rounded-sm shadow-sm">
        <div className="flex border-b border-gray-300 mb-6">
          <div className="px-5 py-2 text-sm font-bold text-gray-800">会员组</div>
          <div className="px-5 py-2 text-sm text-gray-500 cursor-pointer hover:text-gray-800">默认组</div>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-gray-100 font-semibold text-sm">
            <span>编号</span><span>头衔</span><span>用户组图标</span><span>升级点数要求</span><span>操作</span>
          </div>
          <div className="divide-y divide-gray-200">
            {groups.map((group, index) => (
              <div key={group.id || `new-${index}`} className="grid grid-cols-5 gap-4 px-4 py-2 items-center">
                <Input type="number" value={group.level_id} onChange={e => handleGroupChange(index, 'level_id', parseInt(e.target.value))} />
                <Input value={group.name} onChange={e => handleGroupChange(index, 'name', e.target.value)} />
                <Input value={group.icon || ''} onChange={e => handleGroupChange(index, 'icon', e.target.value)} />
                <Input type="number" value={group.points_required} onChange={e => handleGroupChange(index, 'points_required', parseInt(e.target.value))} />
                <div className='flex space-x-2'>
                  <Link to={`/admin/users/groups/${group.level_id}`} className="hover:underline flex items-center"><Pen size={14} className="mr-1" />编辑权限</Link>
                  <button onClick={() => deleteGroup(group, index)} className="text-red-500 hover:underline flex items-center"><Trash2 size={14} className="mr-1" />删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t pt-4 space-x-4">
          <Button onClick={handleSubmit}>提交</Button>
          <Button variant="outline" onClick={addGroup}>添加</Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserGroupsPage;

