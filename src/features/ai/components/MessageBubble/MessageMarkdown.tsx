import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** HTML stays escaped; react-markdown filters unsafe URL protocols. */
const MessageMarkdown = ({ text }: { text: string }) => <div className="message-markdown">
  <Markdown remarkPlugins={[remarkGfm]} components={{
    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    table: ({ children }) => <div className="message-markdown__table"><table>{children}</table></div>,
    img: ({ alt }) => <span>{alt}</span>,
  }}>{text}</Markdown>
</div>;
export default MessageMarkdown;
