import React, { FC } from 'react';
import AppViewService from 'app/services/AppView/AppViewService';
import Languages from 'services/languages/languages';
import { ChannelResource } from 'app/models/Channel';
import { useWorkspace } from 'app/state/recoil/hooks/useWorkspaces';

type PropsType = {
  id: string;
  viewService: AppViewService;
};

const ViewName: FC<PropsType> = props => {
  //Listen context and app_id changes
  props.viewService.useWatcher(() => [
    props.viewService.getConfiguration().app?.id,
    props.viewService.getConfiguration().context,
  ]);

  const configuration = props.viewService.getConfiguration();

  const channelCollection = configuration.collection;
  let channel = null;
  if (channelCollection?.findOne) {
    channel = channelCollection.findOne({ id: props.id });
  }

  const { workspace } = useWorkspace((channel as ChannelResource)?.data?.workspace_id || '');

  let text = '';
  if (channel && workspace) {
    text =
      (workspace ? workspace.name + ' • ' : '') + ((channel as ChannelResource).data.name || '');
  }

  return <span>{Languages.t('scenes.app.side_app.messages_thread_title', [text])}</span>;
};
export default ViewName;
