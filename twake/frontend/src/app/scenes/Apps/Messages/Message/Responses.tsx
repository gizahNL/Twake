import React from 'react';
import { useThreadMessages } from 'app/state/recoil/hooks/messages/useThreadMessages';
import Message from './Message';
import { MessageContext } from './MessageWithReplies';
import ThreadSection from '../Parts/ThreadSection';

type Props = {
  companyId: string;
  threadId: string;
};

export default ({ threadId, companyId }: Props) => {
  let { messages } = useThreadMessages({ companyId, threadId });

  return (
    <>
      {messages.map(m => {
        return (
          <MessageContext.Provider key={m.id} value={{ ...m, id: m.id || '' }}>
            <ThreadSection withAvatar alinea small>
              <Message />
            </ThreadSection>
          </MessageContext.Provider>
        );
      })}
    </>
  );
};
