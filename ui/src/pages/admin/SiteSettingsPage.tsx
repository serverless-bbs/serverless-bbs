import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import PlusCircle from 'lucide-react/dist/esm/icons/plus-circle';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { Link } from 'react-router-dom';

interface FriendlyLink { name: string; url: string; }
interface SiteSettings {
  site_name: string;
  site_slogan: string;
  site_logo_url: string; // 使用完整的 URL
  site_icp: string;
  friendly_links: FriendlyLink[];
}

const SiteSettingsPage = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    apiClient.get<SiteSettings>('/admin/settings')
      .then(data => setSettings(data || { site_name: '', site_slogan: '', site_logo_url: '', site_icp: '', friendly_links: [] }))
      .catch(console.error);
  }, []);

  const handleSettingChange = (key: keyof SiteSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await apiClient.postFormData<{ url: string }>('/admin/settings/logo', formData);
      // API 现在直接返回完整的 URL
      handleSettingChange('site_logo_url', res.url);
      toast({ title: "成功", description: "LOGO 已上传。" });
    } catch (error: any) {
      toast({ title: "上传失败", description: error.message, variant: "destructive" });
    }
  };

  const handleLinkChange = (index: number, field: 'name' | 'url', value: string) => { /* ... */ };
  const addLink = () => handleSettingChange('friendly_links', [...(settings?.friendly_links || []), { name: '', url: '' }]);
  const removeLink = (index: number) => handleSettingChange('friendly_links', (settings?.friendly_links || []).filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!settings) return;
    try {
      // 在提交时移除 site_logo_url，因为它通过专门的端点上传
      const { site_logo_url, ...otherSettings } = settings;
      await apiClient.put('/admin/settings', otherSettings);
      toast({ title: "成功", description: "站点设置已保存。" });
    } catch (error: any) {
      toast({ title: "错误", description: `保存失败: ${error.message}`, variant: "destructive" });
    }
  };

  if (!settings) return <AdminLayout><p>正在加载...</p></AdminLayout>;

  // 直接使用完整的 URL
  const logoUrl = settings.site_logo_url ? `${settings.site_logo_url}?t=${Date.now()}` : '';

  return (
    <AdminLayout>
      <div>

        <div className="flex border-b border-gray-300 mb-[19px]">
          <div className="px-0 mr-5 pt-0 py-2 text-[14px] font-bold text-[#336699] border-b-2 border-[#336699] -mb-px">站点设置</div>
          <Link to="/admin/setting/nodes" className="px-0 mr-5 pt-0 py-2 text-[14px] text-gray-600 hover:text-[#336699]">版块管理</Link>
        </div>

        <div className="bg-white p-6 border rounded-sm shadow-sm">
          <div className="space-y-6">
            <div><label className="block text-sm font-semibold mb-1">站点名称</label><Input value={settings.site_name} onChange={e => handleSettingChange('site_name', e.target.value)} /></div>
            <div><label className="block text-sm font-semibold mb-1">站点口号</label><Input value={settings.site_slogan} onChange={e => handleSettingChange('site_slogan', e.target.value)} /></div>
            <div>
              <label className="block text-sm font-semibold mb-1">站点LOGO</label>
              <div className="flex items-center space-x-4">
                {logoUrl && <img src={logoUrl} alt="Site Logo Preview" className="h-10 border bg-gray-100 p-1" />}
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>上传新LOGO</Button>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/png, image/jpeg, image/gif, image/svg+xml" className="hidden" />
              </div>
            </div>
            <div><label className="block text-sm font-semibold mb-1">备案号(ICP)</label><Input value={settings.site_icp} onChange={e => handleSettingChange('site_icp', e.target.value)} /></div>
            <div>
              <label className="block text-sm font-semibold mb-2">友情链接</label>
              <div className="space-y-2">{settings.friendly_links.map((link, index) => (<div key={index} className="flex items-center space-x-2"><Input placeholder="名称" value={link.name} onChange={e => handleLinkChange(index, 'name', e.target.value)} /><Input placeholder="URL" value={link.url} onChange={e => handleLinkChange(index, 'url', e.target.value)} /><Button variant="ghost" size="icon" onClick={() => removeLink(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>))}</div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addLink}><PlusCircle className="w-4 h-4 mr-2" />添加链接</Button>
            </div>
          </div>
          <div className="mt-8 border-t pt-4"><Button onClick={handleSubmit}>提交</Button></div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SiteSettingsPage;
