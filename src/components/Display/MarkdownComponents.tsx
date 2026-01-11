// @ts-nocheck
import React from 'react';

export const createMarkdownComponents = (activeIndex: number | null, displayedRepos: any[]) => {
    return {
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
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
        a({ node, ...props }: any) {
            return <a className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
        },
        img({ node, src, alt, ...props }: any) {
            let imageSrc = src;
            if (activeIndex !== null && displayedRepos[activeIndex] && src && !src.startsWith('http')) {
                const repo = displayedRepos[activeIndex];
                const githubUrl = repo.githubUrl;
                const urlParts = githubUrl.split('/');
                const owner = urlParts[urlParts.length - 2];
                const repoName = urlParts[urlParts.length - 1];

                if (src.startsWith('./')) {
                    imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main/${src.slice(2)}`;
                } else if (src.startsWith('/')) {
                    imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main${src}`;
                } else if (!src.startsWith('#')) {
                    imageSrc = `https://raw.githubusercontent.com/${owner}/${repoName}/main/${src}`;
                }
            }

            return (
                <img
                    className="max-w-full h-auto my-4 rounded first:mt-0"
                    style={{ maxHeight: '200px' }}
                    loading="lazy"
                    src={imageSrc}
                    alt={alt}
                    onError={(e: any) => {
                        if (e.target.src.includes('/main/')) {
                            e.target.src = e.target.src.replace('/main/', '/master/');
                        } else {
                            e.target.style.display = 'none';
                        }
                    }}
                    {...props}
                />
            )
        },
        h1({ node, ...props }: any) {
            return <h1 className="text-xl font-bold border-b border-[#333333] pb-1 mb-4 mt-6 first:mt-0" {...props} />
        },
        h2({ node, ...props }: any) {
            return <h2 className="text-lg font-bold border-b border-[#333333] pb-1 mb-3 mt-5 first:mt-0" {...props} />
        },
        h3({ node, ...props }: any) {
            return <h3 className="text-md font-bold mb-3 mt-4 first:mt-0" {...props} />
        },
        p({ node, ...props }: any) {
            return <p className="mb-4 leading-relaxed first:mt-0" {...props} />
        },
        ul({ node, ...props }: any) {
            return <ul className="list-disc pl-6 mb-4 first:mt-0" {...props} />
        },
        ol({ node, ...props }: any) {
            return <ol className="list-decimal pl-6 mb-4 first:mt-0" {...props} />
        },
        li({ node, ...props }: any) {
            return <li className="mb-1" {...props} />
        },
        blockquote({ node, ...props }: any) {
            return <blockquote className="border-l-4 border-amber-700/50 pl-4 py-1 mb-4 italic text-white/70 first:mt-0" {...props} />
        },
        table({ node, ...props }: any) {
            return (
                <div className="overflow-x-auto w-full my-4 first:mt-0">
                    <table className="min-w-full divide-y divide-[#333333] border border-[#333333]" {...props} />
                </div>
            )
        },
        thead({ node, ...props }: any) {
            return <thead className="bg-[#212121]" {...props} />
        },
        tbody({ node, ...props }: any) {
            return <tbody className="divide-y divide-[#333333]" {...props} />
        },
        tr({ node, ...props }: any) {
            return <tr className="hover:bg-[#2a2a2a]" {...props} />
        },
        th({ node, ...props }: any) {
            return <th className="px-3 py-2 text-left text-xs font-medium text-white/80 uppercase tracking-wider" {...props} />
        },
        td({ node, ...props }: any) {
            return <td className="px-3 py-2 text-sm" {...props} />
        },
        hr({ node, ...props }: any) {
            return <hr className="border-[#333333] my-4 first:mt-0" {...props} />
        },
        pre({ node, children, ...props }: any) {
            return <pre className="bg-transparent first:mt-0" {...props}>{children}</pre>
        },
    };
};
