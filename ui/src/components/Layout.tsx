import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Select, SelectContent, SelectTrigger, SelectValue } from './ui/select';
import { SelectItem } from '@radix-ui/react-select';
import Search from 'lucide-react/dist/esm/icons/search';
import AuthPage from '@/pages/AuthPage';
import defaultAvatar from '@/img/default_avatar.svg';
import { toast } from './ui/use-toast';
import { useConfig } from '@/contexts/ConfigContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('threads');
  const { rpName, rpSubtitle } = useConfig(); // 2. 从 context 获取论坛名称

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchTerm)}&type=${searchType}`);
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部用户信息栏 */}
      <div className="bg-white border-b border-[#E5EDF2] text-xs">
        <div className="max-w-[960px] mx-auto h-8 flex justify-start items-center space-x-2 text-[#666]">
          <a
            href="#"
            className="text-[#333]"
            onClick={(e) => {
              e.preventDefault();
              toast({ title: "提示信息", description: "非 IE 浏览器请手动将本站设为首页" });
            }}
          >设为首页</a>
          <a href="#" className="text-[#333]" onClick={(e) => {
            e.preventDefault();
            toast({ title: "提示信息", description: "请按 Ctrl+D 键添加到收藏夹" });
          }}>收藏本站</a>
        </div>
      </div>

      {/* 主 Logo 和搜索栏 */}
      <div className="bg-white py-4 shadow-sm">
        <div className="max-w-[960px] mx-auto flex justify-between items-center">
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-3xl font-bold text-[#336699] tracking-tighter">{rpName}</h1>
            <p className="text-xs text-gray-400">{rpSubtitle}</p>
          </Link>
          {isAuthenticated && user ? (
            <table className='text-right space-y-3'>
              <tbody>
                <tr>
                  <td>
                    <div className='space-x-2'>
                      <strong className="text-black">{user.username}</strong> 在线
                      <span>|</span>
                      <Link to="/settings" className="text-[#333]">我的设置</Link>
                      <span>|</span>
                      {
                        user.role == 'admin'
                        &&
                        <>
                          <Link to="/admin/dashboard" target='_blank' className="text-[#333]">管理后台</Link>
                          <span>|</span>
                        </>
                      }
                      <Link to="/notifications" className="text-[#333]">消息</Link>
                      <span>|</span>
                      <a href="#" onClick={handleLogout} className="text-[#333]">退出</a>
                    </div>
                  </td>
                  <td rowSpan={2} className='pl-2'>
                    <Link to={`/users/${user.id}`}>
                      <img src={user.avatar ? user.avatar : defaultAvatar} className="mx-auto object-cover w-[48px] h-[48px] border-[2px] border-t-[#F2F2F2] border-r-[#CDCDCD] border-b-[#CDCDCD] border-l-[#F2F2F2] rounded-[5px]" alt="avatar" />
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td className='pt-2'>
                    <div className='space-x-2'>
                      <strong className="text-black">积分: 4170</strong>
                      <span>|</span>
                      <a href="#" className="text-[#333]">用户组: 论坛元老</a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <AuthPage />
          )}

        </div>
      </div>

      {/* 主导航 */}
      <div className="bg-[#2B7ACD] text-white shadow-inner" style={{background: 'linear-gradient(180deg, #2f80d1, #3f8ed6 2px, #3585d3 3px, #235994)'}}>
        <div className="max-w-[960px] mx-auto h-[33px] flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="h-[33px] font-bold text-sm text-white bg-[#12406f] px-4 py-2">
              论坛
              <div className='w-[20px] h-[3px] bg-white mt-[5px] mx-auto' style={{boxShadow: '0 -6px 9px #fff'}}></div>
            </Link>
            <Link to="/rankings" className="h-[33px] font-bold text-sm text-white hover:bg-[#12406f] px-4 py-2">排行榜</Link>
          </div>
        </div>
      </div>
      <div className="max-w-[960px] mx-auto bg-[#e8eff5] p-2 px-4">
        <div className="flex space-x-5">
          <div className="flex">
            <Input
              type="text"
              placeholder="请输入搜索内容"
              className="w-56 h-8 text-xs rounded-r-none bg-white border-gray-300 focus:border-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-[70px] h-8 rounded-none text-xs border-x-0 border-gray-300 bg-white">
                {searchType === 'threads' ? '帖子' : '用户'}
              </SelectTrigger>
              <SelectContent className='bg-white dark:bg-gray-800'>
                <SelectItem className='cursor-pointer' value="threads">帖子</SelectItem>
                <SelectItem className='cursor-pointer' value="users">用户</SelectItem>
              </SelectContent>
            </Select>
            <Button className="h-8 bg-[#336699] hover:bg-[#2366A8] rounded-l-none" onClick={handleSearch}>
              <Search className='w-[16px] text-white' />
            </Button>
          </div>
          <div className='text-xs inline-flex items-center' style={{ width: '1000px' }}>
            <b>热搜:</b>
            <span className="text-[#369]">
              香港vps
              香港VPS
              amh
              机柜
              vps
              分销
              VPS
              域名出售
              火车头
              云主机
              不限流量
              香港服务器
              美国服务器
            </span>
          </div>

        </div>
      </div>

      {/* 面包屑导航和公告区 */}
      <Breadcrumbs />

      <main className="flex-grow w-full">
        {children}
      </main>

      <footer className="w-full mt-8">
        <div className="max-w-[960px] mx-auto py-4 px-4 text-center text-xs text-[#666] border-t border-[#CDCDCD]">
          <p>Powered by <a href="https://github.com/serverless-bbs/serverless-bbs" className='font-bold hover:underline hover:text-[#336699]' target="_blank">ServerlessDiscuz!</a></p>
          <p className="mt-1 text-[12px]">
            <span className='inline-block' style={{ transform: 'rotate(180deg)' }}>©</span>
            2004-2025 Inspired by <a href='//www.comsenz.com' target='_blank'>Comsenz</a> | Hosted on <a href='//www.cloudflare.com' target='_blank'>Cloudflare</a> | Accelerate by <a href='//edgeone.ai' target='_blank'>Edgeone</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
