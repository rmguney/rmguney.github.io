import React from 'react';
import type { Components } from 'react-markdown';

const isRepoRelative = (url: string): boolean => !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url);

const resolveAgainst = (url: string, base: string | null): string => {
    if (!base || !isRepoRelative(url)) return url;
    try {
        return new URL(url.replace(/^\/+/, ''), base).href;
    } catch {
        return url;
    }
};

const resolveSrcSet = (srcSet: string, base: string | null): string =>
    srcSet.split(',').map(candidate => {
        const [url, ...descriptors] = candidate.trim().split(/\s+/);
        return [resolveAgainst(url, base), ...descriptors].join(' ');
    }).join(', ');

const repoPathOf = (githubUrl?: string): string | null => {
    try {
        return githubUrl ? new URL(githubUrl).pathname.replace(/^\/|\/$/g, '') || null : null;
    } catch {
        return null;
    }
};

export const createMarkdownComponents = (githubUrl?: string): Components => {
    const repoPath = repoPathOf(githubUrl);
    const rawBase = repoPath ? `https://raw.githubusercontent.com/${repoPath}/HEAD/` : null;
    const blobBase = repoPath ? `https://github.com/${repoPath}/blob/HEAD/` : null;

    return {
        code({ node: _node, className, ...props }) {
            return <code className={`bg-[#212121] px-1.5 py-0.5 rounded text-sm ${className ?? ''}`} {...props} />
        },
        a({ node: _node, href, ...props }) {
            return <a className="text-amber-300 hover:underline" target="_blank" rel="noopener noreferrer" href={href && resolveAgainst(href, blobBase)} {...props} />
        },
        img({ node: _node, src, ...props }) {
            return (
                <img
                    className="inline max-w-full h-auto"
                    loading="lazy"
                    src={typeof src === 'string' ? resolveAgainst(src, rawBase) : undefined}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.style.display = 'none';
                    }}
                    {...props}
                />
            )
        },
        source({ node: _node, srcSet, ...props }) {
            return <source srcSet={typeof srcSet === 'string' ? resolveSrcSet(srcSet, rawBase) : undefined} {...props} />
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
        pre({ node: _node, ...props }) {
            return <pre className="bg-[#212121] p-3 rounded-md overflow-x-auto my-4 first:mt-0 [&>code]:p-0 [&>code]:bg-transparent [&>code]:rounded-none" {...props} />
        },
    };
};
