import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Home from 'lucide-react/dist/esm/icons/home';

// 定义面包屑每一项的类型
interface Crumb {
    label: string;
    path: string;
}

// 定义后端返回的节点和帖子类型
interface Node { name: string; }
interface Thread { title: string; node_id: number; }

export default function Breadcrumbs() {
    const location = useLocation();
    const [crumbs, setCrumbs] = useState<Crumb[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const generateCrumbs = async () => {
            setLoading(true);
            const pathnames = location.pathname.split('/').filter(x => x);
            const newCrumbs: Crumb[] = [{ label: '论坛', path: '/' }];

            // 使用 for...of 循环确保异步操作按顺序执行
            for (let i = 0; i < pathnames.length; i++) {
                const value = pathnames[i];
                const to = `/${pathnames.slice(0, i + 1).join('/')}`;
                try {
                    if (value === 'nodes' && pathnames[i + 1]) {
                        const nodeId = pathnames[i + 1];
                        const node = await apiClient.get<Node>(`/nodes/${nodeId}`);
                        newCrumbs.push({ label: node.name, path: to });
                    } else if (value === 'threads' && pathnames[i + 1]) {
                        const threadId = pathnames[i + 1];
                        const thread = await apiClient.get<Thread>(`/threads/${threadId}`);
                        const node = await apiClient.get<Node>(`/nodes/${thread.node_id}`);
                        newCrumbs.push({ label: node.name, path: `/nodes/${thread.node_id}` });
                        newCrumbs.push({ label: thread.title, path: to });
                    } else if (value === 'users' && pathnames[i + 1]) {
                        const username = pathnames[i + 1]
                        if (pathnames[i + 2] === 'threads') {
                            newCrumbs.push({ label: '个人资料', path: location.pathname.replace(/\/threads$/, '') });
                            newCrumbs.push({ label: '主题', path: `${to}/threads` });
                            i++; // 跳过下一个路径段 'threads'
                        } else {
                            newCrumbs.push({ label: '个人资料', path: to });
                        }
                    } else if (value === 'settings') {
                        newCrumbs.push({ label: '设置', path: to });
                    } else if (value === 'notifications') {
                        newCrumbs.push({ label: '通知', path: to });
                    }
                } catch (error) {
                    console.error("Failed to fetch breadcrumb data for path:", to, error);
                }
            }
            
            // 过滤掉重复路径并更新状态
            const uniqueCrumbs = newCrumbs.filter((v, i, a) => a.findIndex(t => (t.path === v.path)) === i);
            setCrumbs(uniqueCrumbs);
            setLoading(false);
        };

        generateCrumbs();
    // 使用更稳定的依赖项数组，防止无限循环
    }, [location.pathname]);

    if (loading || crumbs.length <= 1) {
        return null; // 在加载中或在首页时不显示面包屑
    }

    return (
        <div className="max-w-[960px] mx-auto w-full mt-2">
            <div className="text-xs text-gray-500 mb-2 flex items-center space-x-1">
                <Home className='w-[15px]' />
                <ChevronRight size={14} className="text-gray-400" />
                {crumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <ChevronRight size={14} className="text-gray-400" />}
                        {index === crumbs.length - 1 ? (
                            <span className="text-gray-700">{crumb.label.length > 30 ? `${crumb.label.substring(0, 30)}...` : crumb.label}</span>
                        ) : (
                            <Link to={crumb.path} className="text-[#336699] hover:underline">
                                {crumb.label}
                            </Link>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
