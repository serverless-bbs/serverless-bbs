import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { RichTextEditor } from '@/components/RichTextEditor';
import type { ThreadWithDetails, PollOption, UserVote, Reply } from '../types'; // 从共享类型导入
import defaultAvatar from '@/img/default_avatar.svg';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Lock from 'lucide-react/dist/esm/icons/lock';
import MessageSquareQuote from 'lucide-react/dist/esm/icons/message-square-quote';
import Pen from 'lucide-react/dist/esm/icons/pen';


// --- 子组件 ---

// 投票组件 (已更新样式和错误处理)
const PollComponent = ({ threadId, options, userVote, onVoted }: { threadId: number, options: PollOption[], userVote?: UserVote, onVoted: () => void }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);
  const hasVoted = !!userVote;
  const { toast } = useToast();

  const handleSubmitVote = async () => {
    if (selectedOption === null) {
      toast({ title: "提示", description: "请选择一个选项再提交。" });
      return;
    }
    try {
      await apiClient.post(`/threads/${threadId}/vote`, { optionId: selectedOption });
      onVoted();
    } catch (error: any) {
      // 已修复：确保能正确提取和显示错误信息
      const description = error?.message || (typeof error === 'string' ? error : "出错了，请稍后再试。");
      toast({
        title: "投票失败",
        description: description,
      });
      console.error(error);
    }
  };

  const barColors = ['bg-red-500', 'bg-orange-400', 'bg-amber-400', 'bg-green-500', 'bg-sky-500', 'bg-indigo-500'];

  return (
    <div className="my-4 border border-[#E5EDF2] bg-[#F5FAFE] text-sm">
      <div className="p-4 border-b border-[#E5EDF2]">
        <p className="font-bold">单选投票: <span className="font-normal text-gray-500">(共有 {totalVotes} 人参与投票)</span></p>
      </div>
      <div className="p-4 space-y-4">
        {options.map((opt, index) => {
          const percentage = totalVotes > 0 ? (opt.vote_count / totalVotes) * 100 : 0;
          return (
            <div key={opt.id}>
              <input type="radio" id={`poll-option-${opt.id}`} name="poll-vote" disabled={hasVoted} value={opt.id} onChange={() => setSelectedOption(opt.id)} className="mr-2 h-4 w-4" />
              <label htmlFor={`poll-option-${opt.id}`}>{opt.option_text}</label>
              <div className="flex items-center space-x-3">
                <div className="w-full bg-gray-200 h-3">
                  <div
                    className={`${barColors[index % barColors.length]} h-3`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-28 text-left shrink-0">
                  {percentage.toFixed(2)}% (<strong className="text-red-500">{opt.vote_count}</strong>)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-[#E5EDF2]">
        {hasVoted ? (
          <p className="text-gray-500 text-sm">您已经投过票, 谢谢您的参与</p>
        ) : (
          <Button size="sm" className="h-7 px-4 text-sm bg-[#336699] hover:bg-[#2366A8]" onClick={handleSubmitVote}>提交</Button>
        )}
      </div>
    </div>
  );
};

// 私密回复的占位符组件
const PrivateReplyPlaceholder = () => (
  <div className="border border-dashed border-red-300 bg-red-50 p-2 text-center text-sm text-red-700">
    <Lock className='w-[16px] h-[16px] inline mr-1' />
    此帖仅作者可见
  </div>
);

const Post = ({ type, post, isOp, floor, onQuote, onVoted, canViewPrivate }: { type: 'thread' | 'reply', post: (any | ThreadWithDetails | Reply) & { author_username: string, author_avatar?: string, body: string, created_at: number, is_author_only?: boolean }, isOp?: boolean, floor: number, onQuote: () => void, onVoted?: () => void, canViewPrivate: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleSendMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/notifications', { state: { newConversationWith: post.author_username } });
  };

  const avatarUrl = post.author_avatar ? post.author_avatar : defaultAvatar;
  const hasQuote = 'quoted_author' in post && post.quoted_author;
  // 判断是否为私密回复且当前用户无权查看
  const isPrivateAndHidden = !canViewPrivate;

  return (
    <div className="bg-white border-x border-[#CDCDCD] border-b-4 border-b-[#C2D5E3] flex">
      <div className="w-40 shrink-0 border-r bg-[#E5EDF2] pt-2 pb-8 text-left text-xs">
        <div className="border-b border-dashed border-b-[#cdcdcd] pb-3 mb-4 px-4">
          <Link to={`/users/${post.author_id}`} className="font-bold text-base text-[#336699] hover:underline">{post.author_username}</Link>
        </div>
        <div className="my-2 px-4">
          <Link to={`/users/${post.author_id}`}>
            <img src={avatarUrl} className="mx-auto w-full object-cover" alt="avatar" />
          </Link>
        </div>
        <div className='px-4'>
          <p>中级会员</p><div className="my-2 space-y-1"><p>主题: 15</p><p>回帖: 136</p><p>积分: 340</p></div>
          <a className="inline-flex text-xs cursor-pointer text-[#369] hover:underline" onClick={handleSendMessage}>
            <Mail className='text-[#369] w-[15px]' />
            发消息
          </a>
        </div>
      </div>
      <div className="w-full p-2 px-4 bg-white" id={`reply-${post.id}`}>
        <div className="flex justify-between items-center text-xs text-gray-500 border-b border-dashed border-[#E5EDF2] pb-2 mb-4">
          <span>发表于: {format(new Date(post.created_at * 1000), 'yyyy-MM-dd HH:mm:ss')}</span>
          <div>{isOp && <span className="mr-2">楼主</span>}<span className="font-bold text-lg">#{floor}</span></div>
        </div>

        {
          isPrivateAndHidden ?
            <PrivateReplyPlaceholder />
            :
            <div className="prose prose-sm max-w-none text-base leading-relaxed min-h-[220px] text-[14px]" dangerouslySetInnerHTML={{ __html: post.body }} />
        }

        {isOp && post.type === 'poll' && post.poll_options && onVoted && (
          <PollComponent
            threadId={post.id}
            options={post.poll_options}
            userVote={post.user_vote}
            onVoted={onVoted}
          />
        )}

        {hasQuote && (
          <blockquote className="bg-[#F5FAFE] border border-[#E5EDF2] p-3 my-4 text-sm text-gray-600">
            <p><strong>{post.quoted_author}</strong> 发表于 {format(new Date((post.quoted_created_at || 0) * 1000), 'yyyy-MM-dd HH:mm')}</p>
            <div className="mt-2" dangerouslySetInnerHTML={{ __html: post.quoted_body || '' }} />
          </blockquote>
        )}

        <div className="mt-4 space-x-4">
          {(!isOp && !isPrivateAndHidden) &&
            <Button onClick={onQuote} size="sm" variant="ghost" className="text-xs text-gray-500 hover:text-gray-900 px-0">
              <MessageSquareQuote className='w-[18px] mr-1' />
              回复
            </Button>
          }
          {user && user.id == post.author_id &&
            <Link to={type === `thread` ? `/threads/${post.id}/update` : `/threads/${post.thread_id}/replies/${post.id}/update`} className="text-xs text-gray-500 hover:text-gray-900 px-0 inline-flex items-center">
              <Pen className='w-[15px] mr-1' />
              编辑
            </Link>
          }
        </div>
      </div>
    </div>
  );
};

const QuickReplyForm = ({ threadId, onReplyPosted, quotingReply, clearQuoting }: { threadId: string, onReplyPosted: () => void, quotingReply: any | Reply | null, clearQuoting: () => void }) => {
  const { isAuthenticated, user } = useAuth();
  const [body, setBody] = useState('');
  const { toast } = useToast();
  const avatarUrl = user?.avatar ? user.avatar : defaultAvatar;

  const handleSubmit = async () => {
    // if (!quotingReply) {
    //     toast({
    //         title: "操作无效",
    //         description: "请点击一个回帖下方的“回复”按钮来引用回复。",
    //     });
    //     return;
    // }

    if (!body.trim() || body === '<br>') return;
    try {
      await apiClient.post(`/threads/${threadId}/replies`, { body, replyToId: quotingReply ? quotingReply.id : null });
      toast({ title: "成功", description: "回复已发布。" });
      setBody('');
      clearQuoting();
      onReplyPosted();
    } catch (error: any) {
      toast({ title: "错误", description: error.message || "发布失败", });
    }
  };

  if (!isAuthenticated) return null;
  return (
    <>
      <div className="w-40 shrink-0 border-r border-[#E5EDF2] p-4 text-center text-xs bg-[#F5FAFE]">
        <a href="#" className="font-bold text-base text-[#336699]">{user?.username}</a>
        <div className="my-2">
          <img src={avatarUrl} className="mx-auto w-full object-cover" alt="avatar" />
        </div>
      </div>
      <div className="w-full bg-white p-4">{quotingReply && (<div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 text-xs mb-2">正在回复: <strong>{quotingReply.author_username}</strong> 的帖子 <button onClick={clearQuoting} className="float-right font-bold hover:text-black">取消</button></div>)}
        <RichTextEditor value={body} onChange={setBody} />
        <div className="mt-2">
          <Button onClick={handleSubmit} className="bg-[#0066CC] hover:bg-[#0055AA] text-white text-sm px-6 h-8 font-bold">发表回复</Button>
        </div>
      </div>
    </>
  );
};

// --- 主页面组件 ---
export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const [thread, setThread] = useState<ThreadWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotingReply, setQuotingReply] = useState<Reply | null>(null);
  const replyFormRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchThread = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const data = await apiClient.get<ThreadWithDetails>(`/threads/${threadId}`);
      setThread(data);
      if (location.hash) {
        const hash = location.hash;
        location.hash = ``;
        setTimeout(() => {
          location.hash = hash;
        }, 50);
      }
    } catch (error: any) {
      toast({ title: "加载失败", description: error.message, });
    }
    finally { setLoading(false); }
  }, [threadId, toast]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  const handleSetQuoting = (reply: Reply) => {
    setQuotingReply(reply);
    replyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) return <div className="max-w-[960px] mx-auto text-center py-10">正在加载...</div>;
  if (!thread) return <div className="max-w-[960px] mx-auto text-center py-10">未找到该帖子或加载失败。</div>;

  return (
    <div className="max-w-[960px] mx-auto w-full space-y-0">
      <div className="bg-white border border-[#CDCDCD] border-r-[#C2D5E3] border-b-4 border-b-[#C2D5E3]  flex">
        <div className="w-40 shrink-0 border-r bg-[#E5EDF2] p-4 text-center text-xs text-[#999]">
          查看:
          <span className='text-[#F26C4F] mr-1'>3228</span>
          |
          回复:
          <span className='text-[#F26C4F]'>54</span>
        </div>
        <div className="w-full px-2 py-3 bg-white" id="reply-3">
          <h1 className="font-bold break-words px-2 text-[16px]">{thread.title}</h1>
        </div>
      </div>
      <Post
        type="thread"
        post={thread}
        isOp={true}
        floor={1}
        onQuote={() => { }} // 主楼的 onQuote 是一个空操作，因为按钮已被移除
        onVoted={fetchThread}
        canViewPrivate={true}
      />
      {thread.replies.map((reply: Reply, index: number) => {
        const canView = !!(user && (user.id === reply.author_id || user.id === thread.author_id)) as boolean;
        return (
          <Post
            type="reply"
            key={reply.id}
            post={reply}
            floor={index + 2}
            onQuote={() => handleSetQuoting(reply)}
            canViewPrivate={canView}
          />
        );
      })}
      <div ref={replyFormRef} className="border border-[#CDCDCD] border-t-0 flex mt-4">
        <QuickReplyForm
          threadId={threadId!}
          onReplyPosted={fetchThread}
          quotingReply={quotingReply}
          clearQuoting={() => setQuotingReply(null)}
        />
      </div>
    </div>
  );
}
