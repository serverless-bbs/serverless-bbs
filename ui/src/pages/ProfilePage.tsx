import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Mail from 'lucide-react/dist/esm/icons/mail';
import { format } from 'date-fns';
import defaultAvatar from '@/img/default_avatar.svg';

// 接口定义，完全匹配后端 API 的响应
interface UserProfile {
    id: string;
    username: string;
    created_at: number;
    avatar?: string;
    credits: number;
    thread_count: number;
    reply_count: number;
    last_visit_at: number;
    last_activity_at: number;
    last_post_at: number;
    online_time: number;
    user_group: string;
    silver_coins: number;
    gold_coins: number;
}

// 辅助组件：用于展示资料项
const InfoRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex py-2 text-sm">
        <span className="w-28 text-[#666]">{label}</span>
        <span className="text-black">{children}</span>
    </div>
);

// 辅助组件：用于展示资料分组标题
const InfoHeader = ({ title }: { title: string }) => (
    <h3 className="text-sm font-bold text-black border-b border-dashed border-[#CDCDCD] pb-2 my-3">{title}</h3>
);

export default function ProfilePage() {
    const { username } = useParams<{ username: string }>();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!username) return;
        setLoading(true);
        apiClient.get<UserProfile>(`/users/${username}`)
            .then(setProfile)
            .catch(err => {
                console.error("Failed to fetch profile", err);
                setProfile(null);
            })
            .finally(() => setLoading(false));
    }, [username]);
    
    const handleSendMessage = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/notifications', { state: { newConversationWith: username } });
    };

    if (loading) {
        return <div className="max-w-[960px] mx-auto text-center py-10">正在加载...</div>;
    }
    if (!profile) {
        return <div className="max-w-[960px] mx-auto text-center py-10 text-red-500">用户不存在或加载失败。</div>;
    }

    const avatarUrl = profile.avatar ? profile.avatar : defaultAvatar;

    return (
        <div className="max-w-[960px] mx-auto w-full space-y-4">
            <div className="bg-[#F5FAFE] border border-[#CDCDCD] rounded-sm p-4 flex items-center justify-between">
                <div className="flex items-center">
                    <img src={avatarUrl} alt="avatar" className="w-12 h-12 rounded object-cover" />
                    <div className="ml-4">
                        <h1 className="text-xl font-bold text-gray-800">{profile.username}</h1>
                        <p className="text-sm text-gray-400">{window.location.origin}/users/{profile.id}</p>
                    </div>
                </div>
                <Button variant="outline" className="h-7 px-3 text-xs flex items-center space-x-1" onClick={handleSendMessage}>
                    <Mail size={14} /><span>发送消息</span>
                </Button>
            </div>
            
            <div className="bg-white border border-[#CDCDCD] rounded-sm">
                <div className="flex border-b border-[#CDCDCD]">
                    <div className="border-b-2 border-[#336699] px-5 py-2 text-sm font-bold text-[#336699] -mb-px cursor-pointer">个人资料</div>
                    <Link to={`/users/${username}/threads`} className="px-5 py-2 text-sm text-gray-600 hover:text-[#336699]">主题</Link>
                </div>
                
                <div className="p-6">
                    <InfoRow label="UID">{profile.id}</InfoRow>
                    <InfoRow label="邮箱状态"><span className="text-gray-400">未验证</span></InfoRow>
                    
                    <InfoHeader title="统计信息" />
                    <InfoRow label="回帖数">{profile.reply_count}</InfoRow>
                    <InfoRow label="主题数">{profile.thread_count}</InfoRow>

                    <InfoHeader title="活跃概况" />
                    <InfoRow label="用户组">{profile.user_group}</InfoRow>
                    <InfoRow label="在线时间">{profile.online_time} 小时</InfoRow>
                    <InfoRow label="注册时间">{format(new Date(profile.created_at * 1000), 'yyyy-MM-dd HH:mm')}</InfoRow>
                    <InfoRow label="最后访问">{format(new Date(profile.last_visit_at * 1000), 'yyyy-MM-dd HH:mm')}</InfoRow>
                    <InfoRow label="上次活动时间">{format(new Date(profile.last_activity_at * 1000), 'yyyy-MM-dd HH:mm')}</InfoRow>
                    <InfoRow label="上次发表时间">{format(new Date(profile.last_post_at * 1000), 'yyyy-MM-dd HH:mm')}</InfoRow>

                    <InfoHeader title="统计信息" />
                    <InfoRow label="积分">{profile.credits || 0}</InfoRow>
                    <InfoRow label="金币">{Math.floor(profile.gold_coins)} 枚</InfoRow>
                    <InfoRow label="银币">{Math.floor(profile.silver_coins)} 枚</InfoRow>
                </div>
            </div>
        </div>
    );
}
