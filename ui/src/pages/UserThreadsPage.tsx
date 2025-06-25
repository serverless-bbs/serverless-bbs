import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Mail from 'lucide-react/dist/esm/icons/mail';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import defaultAvatar from '@/img/default_avatar.svg';

// 定义用户主题帖的数据结构
interface UserThread {
    id: number;
    title: string;
    created_at: number;
    reply_count: number;
    view_count: number;
    node_name: string;
    node_id: number;
}

// 定义用户基本信息的数据结构
interface UserInfo {
    id: string;
    username: string;
    avatar?: string;
}

// 辅助组件：页面头部，与个人资料页共享
const ProfileHeader = ({ user }: { user: UserInfo | null }) => {
    const navigate = useNavigate();
    if (!user) return null;
    
    const avatarUrl = user.avatar ? user.avatar : defaultAvatar;
    
    const handleSendMessage = () => {
        navigate('/notifications', { state: { newConversationWith: user.username } });
    };

    return (
        <div className="bg-[#F5FAFE] border border-[#CDCDCD] rounded-sm p-4 flex items-center justify-between">
            <div className="flex items-center">
                <img src={avatarUrl} alt="avatar" className="w-12 h-12 rounded object-cover" />
                <div className="ml-4">
                    <h1 className="text-xl font-bold text-gray-800">{user.username}</h1>
                    <p className="text-sm text-gray-400">{window.location.origin}/users/{user.id}</p>
                </div>
            </div>
            <Button variant="outline" className="h-7 px-3 text-xs flex items-center space-x-1" onClick={handleSendMessage}>
                <Mail size={14} /><span>发送消息</span>
            </Button>
        </div>
    );
};

export default function UserThreadsPage() {
    const { username } = useParams<{ username: string }>();
    const [threads, setThreads] = useState<UserThread[]>([]);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!username) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                // 并行获取用户信息和用户主题列表
                const [userRes, threadsRes] = await Promise.all([
                    apiClient.get<UserInfo>(`/users/${username}`),
                    apiClient.get<UserThread[]>(`/users/${username}/threads`)
                ]);
                setUserInfo(userRes);
                setThreads(threadsRes);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [username]);

    if (loading) {
        return <div className="max-w-[960px] mx-auto text-center py-10">正在加载...</div>;
    }
    if (!userInfo) {
        return <div className="max-w-[960px] mx-auto text-center py-10 text-red-500">用户不存在或加载失败。</div>;
    }

    return (
        <div className="max-w-[960px] mx-auto w-full space-y-4">
            <ProfileHeader user={userInfo} />
            
            <div className="bg-white border border-[#CDCDCD] rounded-sm">
                <div className="flex border-b border-[#CDCDCD]">
                    <Link to={`/users/${username}`} className="px-5 py-2 text-sm text-gray-600 hover:text-[#336699]">个人资料</Link>
                    <div className="border-b-2 border-[#336699] px-5 py-2 text-sm font-bold text-[#336699] -mb-px cursor-pointer">主题</div>
                </div>
                
                <div className="divide-y divide-[#E5EDF2]">
                    {threads.length === 0 ? (
                        <p className="p-6 text-center text-gray-500">该用户还没有发表过主题</p>
                    ) : (
                        threads.map(thread => (
                            <div key={thread.id} className="p-3 flex items-center text-sm">
                                <div className="flex-grow">
                                    <Link to={`/threads/${thread.id}`} className="text-black hover:text-[#336699] hover:underline">
                                        {thread.title}
                                    </Link>
                                </div>
                                <div className="w-48 shrink-0 text-left text-xs">
                                    <Link to={`/nodes/${thread.node_id}`} className="text-[#336699] hover:underline">[{thread.node_name}]</Link>
                                </div>
                                <div className="w-24 shrink-0 text-center text-xs">
                                    <span className="text-red-500">{thread.reply_count}</span>
                                    <span className="text-gray-400"> / {thread.view_count}</span>
                                </div>
                                <div className="w-40 shrink-0 text-right text-xs text-gray-400">
                                    {format(new Date(thread.created_at * 1000), 'yyyy-MM-dd HH:mm')}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
