import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import defaultAvatar from '@/img/default_avatar.svg';
import Mail from 'lucide-react/dist/esm/icons/mail';
import BadgeInfo from 'lucide-react/dist/esm/icons/badge-info';
import { toast } from '@/components/ui/use-toast';

// --- 类型定义 ---
type NavItem = 'messages' | 'reminders';
type MessageView = 'list' | 'conversation' | 'new';

interface ConversationSummary {
    id: number;
    partner_username: string;
    partner_avatar: string;
    last_message_excerpt: string;
    last_message_at: number;
    unread_count: number;
}
interface Message {
    id: number;
    body: string;
    created_at: number;
    author_username: string;
    author_avatar: string;
}
interface Reminder {
    id: number;
    created_at: number;
    actor_id: number;
    actor_username: string;
    actor_avatar: string;
    thread_title: string;
    thread_id: number;
}

// --- 子组件 ---

// 左侧导航菜单
const NotificationsNav = ({ activeTab, setActiveTab }: { activeTab: NavItem, setActiveTab: (tab: NavItem) => void }) => (
    <div className="w-40 shrink-0 bg-white border-r border-[#E5EDF2]">
        <h2 className="px-6 pt-4 pb-2 text-base font-bold text-gray-800">通知</h2>
        <ul className="mt-2">
            <li key='messages'>
                <button onClick={() => setActiveTab('messages')} className={`w-full text-left px-6 py-2 text-sm flex items-center ${activeTab === 'messages' ? 'bg-[#E5EDF2] font-bold' : 'hover:bg-gray-50'}`}>
                    <Mail className='text-gray-500 text-xs mr-1' />
                    消息
                </button>
            </li>
            <li key='reminders'>
                <button onClick={() => setActiveTab('reminders')} className={`w-full text-left px-6 py-2 text-sm flex items-center ${activeTab === 'reminders' ? 'bg-[#E5EDF2] font-bold' : 'hover:bg-gray-50'}`}>
                    <BadgeInfo className='text-gray-500 text-xs mr-1' />
                    系统提醒
                </button>
            </li>
        </ul>
    </div>
);


// 提醒面板
const RemindersPanel = () => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        apiClient.get<Reminder[]>('/reminders')
            .then(setReminders)
            .catch(err => console.error("Failed to fetch reminders:", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center p-2 border-b border-[#E5EDF2] bg-[#F5FAFE]"><div className="flex text-sm"><div className="border-b-2 border-[#336699] px-4 py-2 text-[#336699] font-bold -mb-px cursor-pointer">帖子</div><div className="px-4 py-2 text-gray-500 cursor-pointer hover:text-[#336699]">点评</div></div><a href="#" className="text-xs text-gray-500 hover:underline">筛选设置</a></div>
            <div className="divide-y divide-[#E5EDF2]">
                {loading && <p className="p-6 text-center text-gray-500">正在加载提醒...</p>}
                {!loading && reminders.length === 0 && <p className="p-6 text-center text-gray-500">没有新的提醒</p>}
                {reminders.map(item => (
                    <div key={item.id} className="p-4 flex items-start space-x-3">
                        <img src={item.actor_avatar ? item.actor_avatar : defaultAvatar} alt={item.actor_username} className="w-8 h-8 rounded" />
                        <div className="flex-grow text-sm">
                            <p className="text-xs text-gray-400 mb-1">{formatDistanceToNow(new Date(item.created_at * 1000), { addSuffix: true, locale: zhCN })}</p>
                            <p className="text-gray-800"><Link to={`/users/${item.actor_id}`} className="text-[#336699] font-semibold">{item.actor_username}</Link>{' '}回复了您的帖子{' '}<Link to={`/threads/${item.thread_id}`} className="text-[#336699]">{item.thread_title}</Link></p>
                        </div>
                        <Link to={`/threads/${item.thread_id}`} className="text-sm text-[#336699] hover:underline shrink-0">查看</Link>
                    </div>
                ))}
            </div>
        </div>
    );
};


const ConversationList = ({ conversations, onSelectConversation }: { conversations: ConversationSummary[], onSelectConversation: (id: number, partner: string) => void }) => (
    <div>
        {conversations.map(convo => {
            const avatarUrl = convo.partner_avatar ? convo.partner_avatar : defaultAvatar;
            return (
                <div key={convo.id} className="p-4 border-b border-[#E5EDF2] flex space-x-4 hover:bg-gray-50 cursor-pointer" onClick={() => onSelectConversation(convo.id, convo.partner_username)}>
                    <img src={avatarUrl} alt={convo.partner_username} className="w-12 h-12 rounded-sm" />
                    <div className="flex-grow text-sm">
                        <p className="text-gray-500">与 <a href="#" className="text-[#336699] font-semibold">{convo.partner_username}</a> 的会话 {convo.unread_count > 0 && <span className="text-red-500 font-bold">({convo.unread_count} 条未读)</span>}</p>
                        <p className="mt-1 text-gray-800">{convo.last_message_excerpt}</p>
                        <p className="mt-2 text-xs text-gray-400">{formatDistanceToNow(new Date(convo.last_message_at * 1000), { addSuffix: true, locale: zhCN })}</p>
                    </div>
                </div>
            );
        })}
    </div>
);

const ConversationView = ({ conversationId, partnerUsername, onBack, onSent }: { conversationId: number, partnerUsername: string, onBack: () => void, onSent: () => void }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyBody, setReplyBody] = useState('');

    const fetchMessages = useCallback(async () => {
        const data = await apiClient.get<Message[]>(`/messages/${conversationId}`);
        setMessages(data);
    }, [conversationId]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const handleSendReply = async () => {
        await apiClient.post('/messages', { recipientUsername: partnerUsername, body: replyBody });
        setReplyBody('');
        fetchMessages();
        onSent(); // 通知父组件刷新会话列表
    };

    return (
        <div>
            <div className="px-4 py-2 text-sm border-b border-[#E5EDF2]">共有 {messages.length} 条与 <strong className="text-[#336699]">{partnerUsername}</strong> 的交谈记录</div>
            <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
                {messages.map((msg) => {
                    const avatarUrl = msg.author_avatar ? msg.author_avatar : defaultAvatar;
                    return (
                        <div key={msg.id} className="flex space-x-4">
                            <img src={avatarUrl} alt="avatar" className="w-12 h-12 rounded-sm" />
                            <div className="flex-grow">
                                <p className="text-gray-500 text-sm"><a href="#" className="text-[#336699] font-semibold">{msg.author_username}</a></p>
                                <div className="mt-2 p-3 bg-[#F5FAFE] border border-[#E5EDF2] rounded-sm text-sm" dangerouslySetInnerHTML={{ __html: msg.body }} />
                                <p className="text-xs text-gray-400 mt-2">{formatDistanceToNow(new Date(msg.created_at * 1000), { addSuffix: true, locale: zhCN })}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="p-4 border-t border-[#E5EDF2] flex space-x-4">
                 <img src={user?.avatar ? user.avatar : defaultAvatar} alt={user?.username} className="w-12 h-12 rounded-sm" />
                <div className="flex-grow">
                    <RichTextEditor value={replyBody} onChange={setReplyBody} />
                    <div className="mt-2"><Button onClick={handleSendReply} className="bg-[#336699] hover:bg-[#2366A8] rounded-sm text-sm px-6 h-8 font-bold">发送</Button></div>
                </div>
            </div>
            <div className="p-4 border-t border-[#E5EDF2] text-center"><Button variant="outline" onClick={onBack}>返回消息列表</Button></div>
        </div>
    );
};

// 新建消息视图
const NewMessageView = ({ recipient, onSent, onBack }: { recipient: string, onSent: () => void, onBack: () => void }) => {
    const [body, setBody] = useState('');
    const [recipientName, setRecipientName] = useState(recipient);
    const handleSendMessage = async () => {
        try {
            await apiClient.post('/messages', { recipientUsername: recipientName, body });
            onSent();
        } catch (error) {
            toast({ title: "提示信息", description: `发送出错` });
        }
    };
    return (
        <div className="p-6">
             <div className="mb-4">
                <label className="text-sm text-gray-600 block mb-1">收件人</label>
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full h-8 px-2 border border-[#CDCDCD] rounded-sm text-sm" />
             </div>
             <div className="mb-4">
                <label className="text-sm text-gray-600 block mb-1">内容</label>
                <RichTextEditor value={body} onChange={setBody} />
             </div>
             <div className="mt-4 flex space-x-4">
                <Button onClick={handleSendMessage} className="bg-[#336699] hover:bg-[#2366A8] rounded-sm text-sm px-6 h-8 font-bold">发送</Button>
                <Button variant="outline" className='rounded-sm text-sm px-6 h-8 font-bold' onClick={onBack}>取消</Button>
             </div>
        </div>
    )
}

// --- 主页面组件 ---
export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState<NavItem>('messages');
    const [messageView, setMessageView] = useState<MessageView>('list');
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
    const [partnerUsername, setPartnerUsername] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    
    const newConversationWith = location.state?.newConversationWith;

    const fetchConversations = useCallback(() => {
        apiClient.get<ConversationSummary[]>('/messages').then(setConversations);
    }, []);

    useEffect(() => {
        if (newConversationWith) {
            setActiveTab('messages');
            setMessageView('new');
            setPartnerUsername(newConversationWith);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [newConversationWith, navigate, location.pathname]);
    
    useEffect(() => {
        if (activeTab === 'messages') {
            fetchConversations();
        }
    }, [activeTab, fetchConversations]);

    const handleSelectConversation = (id: number, partner: string) => {
        setSelectedConversationId(id);
        setPartnerUsername(partner);
        setMessageView('conversation');
    };

    const handleMessageSent = () => {
        setMessageView('list');
        fetchConversations();
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'messages':
                switch (messageView) {
                    case 'conversation': return <ConversationView conversationId={selectedConversationId!} partnerUsername={partnerUsername} onBack={() => setMessageView('list')} onSent={fetchConversations}/>;
                    case 'new': return <NewMessageView recipient={partnerUsername} onSent={handleMessageSent} onBack={() => setMessageView('list')}/>;
                    default:
                        return (
                            <div>
                                <div className="flex justify-between items-center p-2 border-b border-[#E5EDF2] bg-[#F5FAFE]"><div className="flex text-sm"><div className="border-b-2 border-[#336699] px-4 py-2 text-[#336699] font-bold -mb-px">私人消息</div></div><Button onClick={() => setMessageView('new')} className="bg-[#336699] hover:bg-[#2366A8] rounded-sm text-sm px-4 h-7 font-bold">发送消息</Button></div>
                                <ConversationList conversations={conversations} onSelectConversation={handleSelectConversation} />
                            </div>
                        );
                }
            case 'reminders':
                return <RemindersPanel />;
            default:
                return <div className="p-6">请选择一个项目。</div>;
        }
    };

    return (
        <div className="max-w-[960px] mx-auto w-full bg-white border border-[#CDCDCD] rounded-sm flex">
            <NotificationsNav activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="flex-grow">{renderContent()}</div>
        </div>
    );
}
