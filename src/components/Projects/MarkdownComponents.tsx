import React from 'react';
import type { Components } from 'react-markdown';
import type { Repository } from '../../types';

export const createMarkdownComponents = (activeIndex: number | null, displayedRepos: Repository[]): Components => {
    return {
        code({ node: _node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return match ? (
                <pre className="bg-[#212121] p-3 rounded-md overflow-x-auto my-4">
                    <code {...props} className={className}>
                        {String(children).replace(/\n$/, '')}
                    </code>
                </pre>
            ) : (
                <code className="bg-[#212121] px-1.5 py-0.5 rounded text-sm" {...props}>
                    {children}
                </code>
            )
        },
        a({ node: _node, ...props }) {
            return <a className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
        },
        img({ node: _node, src, alt, ...props }) {
            let imageSrc = typeof src === 'string' ? src : undefined;
            if (activeIndex !== null && displayedRepos[activeIndex] && imageSrc && !imageSrc.startsWith('http')) {
                const repo = displayedRepos[activeIndex];
                const githubUrl = repo.githubUrl;
                const urlParts = githubUrl.split('/');
                const owner = urlParts[urlParts.length - 2];
                const repoName = urlParts[urlParts.length - 1];

                if (imageSrc.startsWith('./')) {
                    imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main/${imageSrc.slice(2)}`;
                } else if (imageSrc.startsWith('/')) {
                    imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main${imageSrc}`;
                } else if (!imageSrc.startsWith('#')) {
                    imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main/${imageSrc}`;
                }
            }

            return (
                <img
                    className="max-w-full h-auto my-4 rounded first:mt-0"
                    style={{ maxHeight: '200px' }}
                    loading="lazy"
                    src={imageSrc}
                    alt={alt}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        const image = e.currentTarget;
                        if (image.src.includes('/main/')) {
                            image.src = image.src.replace('/main/', '/master/');
                        } else {
                            image.style.display = 'none';
                        }
                    }}
                    {...props}
                />
            )
        },
        h1({ node: _node, ...props }) {
            return <h1 className="text-xl font-bold border-b border-[#333333] pb-1 mb-4 mt-6 first:mt-0" {...props} />
        },
        h2({ node: _node, ...props }) {
            return <h2 className="text-lg font-bold border-b border-[#333333] pb-1 mb-3 mt-5 first:mt-0" {...props} />
        },
        h3({ node: _node, ...props }) {
            return <h3 className="text-md font-bold mb-3 mt-4 first:mt-0" {...props} />
        },
        p({ node: _node, ...props }) {
            return <p className="mb-4 leading-relaxed first:mt-0" {...props} />
        },
        ul({ node: _node, ...props }) {
            return <ul className="list-disc pl-6 mb-4 first:mt-0" {...props} />
        },
        ol({ node: _node, ...props }) {
            return <ol className="list-decimal pl-6 mb-4 first:mt-0" {...props} />
        },
        li({ node: _node, ...props }) {
            return <li className="mb-1" {...props} />
        },
        blockquote({ node: _node, ...props }) {
            return <blockquote className="border-l-4 border-amber-700/50 pl-4 py-1 mb-4 italic text-white/70 first:mt-0" {...props} />
        },
        table({ node: _node, ...props }) {
            return (
                <div className="overflow-x-auto w-full my-4 first:mt-0">
                    <table className="min-w-full divide-y divide-[#333333] border border-[#333333]" {...props} />
                </div>
            )
        },
        thead({ node: _node, ...props }) {
            return <thead className="bg-[#212121]" {...props} />
        },
        tbody({ node: _node, ...props }) {
            return <tbody className="divide-y divide-[#333333]" {...props} />
        },
        tr({ node: _node, ...props }) {
            return <tr className="hover:bg-[#2a2a2a]" {...props} />
        },
        th({ node: _node, ...props }) {
            return <th className="px-3 py-2 text-left text-xs font-medium text-white/80 uppercase tracking-wider" {...props} />
        },
        td({ node: _node, ...props }) {
            return <td className="px-3 py-2 text-sm" {...props} />
        },
        hr({ node: _node, ...props }) {
            return <hr className="border-[#333333] my-4 first:mt-0" {...props} />
        },
        pre({ node: _node, children, ...props }) {
            return <pre className="bg-transparent first:mt-0" {...props}>{children}</pre>
        },
    };
};
