import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { createMarkdownComponents } from './MarkdownComponents';

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw, rehypeSanitize];

interface ReadmeMarkdownProps {
    content: string;
    githubUrl?: string;
}

const ReadmeMarkdown: React.FC<ReadmeMarkdownProps> = ({ content, githubUrl }) => {
    const components = useMemo(() => createMarkdownComponents(githubUrl), [githubUrl]);

    return (
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={components}>
            {content}
        </ReactMarkdown>
    );
};

export default ReadmeMarkdown;
