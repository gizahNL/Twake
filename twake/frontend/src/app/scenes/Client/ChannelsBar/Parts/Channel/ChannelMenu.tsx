// eslint-disable-next-line @typescript-eslint/no-use-before-define
import React from 'react';

import { ChannelMemberType, ChannelType } from 'app/models/Channel';
import ChannelMembersList from 'scenes/Client/ChannelsBar/Modals/ChannelMembersList';
import Icon from 'components/Icon/Icon';
import Menu from 'components/Menus/Menu';
import { Collection } from 'services/CollectionsReact/Collections';
import Languages from 'services/languages/languages';
import AlertManager from 'services/AlertManager/AlertManager';
import UserService from 'services/user/UserService';
import ModalManager from 'app/components/Modal/ModalManager';
import ChannelWorkspaceEditor from 'app/scenes/Client/ChannelsBar/Modals/ChannelWorkspaceEditor';
import Notifications from 'app/services/user/UserNotifications';
import AccessRightsService from 'app/services/AccessRightsService';
import { NotificationResource } from 'app/models/Notification';
import RouterServices from 'app/services/RouterService';
import GuestManagement from 'app/scenes/Client/ChannelsBar/Modals/GuestManagement';
import { useFeatureToggles } from 'app/components/LockedFeaturesComponents/FeatureTogglesHooks';
import LockedGuestsPopup from 'app/components/LockedFeaturesComponents/LockedGuestsPopup/LockedGuestsPopup';
import InitService from 'app/services/InitService';
import ChannelsMineAPIClient from 'app/services/channels/ChannelsMineAPIClient';
import ChannelMembersAPIClient from 'app/services/channels/ChannelMembersAPIClient';
import { isDirectChannel, isPrivateChannel } from 'app/services/channels/utils';
import { useCurrentUser } from 'app/state/recoil/hooks/useCurrentUser';
import useRouterWorkspace from 'app/state/recoil/hooks/router/useRouterWorkspace';
import { ToasterService as Toaster } from 'app/services/Toaster';
import { useFavoriteChannels } from 'app/state/recoil/hooks/channels/useFavoriteChannels';
import FeatureTogglesService from 'app/services/FeatureTogglesService';

type PropsType = {
  channel: ChannelType;
  onClick: () => void;
  onClose: () => void;
};

export default (props: PropsType): JSX.Element => {
  const notificationsCollection = Collection.get('/notifications/v1/badges/', NotificationResource);
  const workspaceId = useRouterWorkspace();
  const { user: currentUser } = useCurrentUser();
  const companyId = props.channel.company_id;
  const { refresh: refreshFavoriteChannels } = useFavoriteChannels();
  const { Feature, FeatureNames } = useFeatureToggles();
  const channelMember: ChannelMemberType = props.channel.user_member || {};

  Languages.useListener();

  const changeNotificationPreference = async (preference: 'all' | 'none' | 'mentions' | 'me') => {
    if (
      props.channel.company_id &&
      props.channel.workspace_id &&
      props.channel.id &&
      currentUser?.id
    ) {
      await ChannelMembersAPIClient.save(
        channelMember,
        { notification_level: preference },
        {
          companyId: props.channel.company_id,
          workspaceId: props.channel.workspace_id,
          channelId: props.channel.id,
          userId: currentUser.id,
        },
      ).finally(refreshFavoriteChannels);
    }
  };

  const addOrCancelFavorite = async (state: boolean) => {
    if (
      props.channel.company_id &&
      props.channel.workspace_id &&
      props.channel.id &&
      currentUser?.id
    ) {
      await ChannelMembersAPIClient.save(
        channelMember,
        { favorite: state },
        {
          companyId: props.channel.company_id,
          workspaceId: props.channel.workspace_id,
          channelId: props.channel.id,
          userId: currentUser.id,
        },
      ).finally(refreshFavoriteChannels);
    }
  };

  const displayMembers = () => {
    return ModalManager.open(<ChannelMembersList channel={props.channel} closable />, {
      position: 'center',
      size: { width: '600px', minHeight: '329px' },
    });
  };

  const displayGuestManagement = () => {
    return ModalManager.open(
      FeatureTogglesService.getFeatureValue(FeatureNames.GUESTS) ? (
        <GuestManagement channel={props.channel} />
      ) : (
        <LockedGuestsPopup
          companySubscriptionUrl={
            InitService.server_infos?.configuration?.accounts?.console?.company_subscription_url ||
            ''
          }
        />
      ),
      {
        position: 'center',
        size: { width: '600px', minHeight: '329px' },
      },
    );
  };

  const leaveChannel = async (isDirectChannel = false) => {
    if (props.channel?.id && props.channel?.company_id && workspaceId) {
      const res = await ChannelsMineAPIClient.removeUser(UserService.getCurrentUserId(), {
        companyId: props.channel.company_id,
        workspaceId: isDirectChannel ? 'direct' : workspaceId,
        channelId: props.channel.id,
      });

      if (res?.error?.length && res?.message?.length) {
        Toaster.error(`${res.error} - ${res.message}`);
      } else {
        redirectToWorkspace();
        refreshFavoriteChannels();
      }
    }
  };

  const redirectToWorkspace = () => {
    const url = RouterServices.generateRouteFromState({
      companyId,
      workspaceId,
      channelId: '',
    });
    return RouterServices.push(url);
  };

  const editChannel = () => {
    ModalManager.open(
      <ChannelWorkspaceEditor
        title={Languages.t('scenes.app.channelsbar.modify_channel_menu')}
        channel={props.channel || {}}
        currentUserId={currentUser?.id}
      />,
      {
        position: 'center',
        size: { width: '600px' },
      },
    );
  };

  const removeChannel = async () => {
    if (companyId && workspaceId && props.channel.id) {
      await ChannelsMineAPIClient.removeChannel(companyId, workspaceId, props.channel.id).then(
        redirectToWorkspace,
      );
    }
  };

  let menu: object[] = [
    {
      type: 'menu',
      text: Languages.t(
        notificationsCollection.find({ channel_id: props.channel.id }).length > 0
          ? 'scenes.app.channelsbar.read_sign'
          : 'scenes.app.channelsbar.unread_sign',
      ),
      onClick: () => {
        notificationsCollection.find({ channel_id: props.channel.id }).length > 0
          ? Notifications.read(props.channel)
          : Notifications.unread(props.channel);
      },
    },
    {
      type: 'menu',
      text: Languages.t(
        props.channel.user_member?.favorite
          ? 'scenes.apps.messages.left_bar.stream.remove_from_favorites'
          : 'scenes.apps.messages.left_bar.stream.add_to_favorites',
      ),
      onClick: () => {
        addOrCancelFavorite(!props.channel.user_member?.favorite);
      },
    },
    {
      hide: !(
        AccessRightsService.hasLevel(workspaceId, 'member') &&
        AccessRightsService.getCompanyLevel(companyId) !== 'guest'
      ),
      type: 'separator',
    },
    {
      type: 'menu',
      hide: !(
        AccessRightsService.hasLevel(workspaceId, 'member') &&
        AccessRightsService.getCompanyLevel(companyId) !== 'guest'
      ),
      text: Languages.t(
        props.channel.visibility && isDirectChannel(props.channel.visibility)
          ? 'scenes.app.channelsbar.hide_discussion_leaving.menu'
          : 'scenes.app.channelsbar.channel_leaving',
      ),
      className: 'danger',
      onClick: () => {
        if (props.channel.visibility) {
          if (isPrivateChannel(props.channel.visibility)) {
            return AlertManager.confirm(() => leaveChannel(), undefined, {
              title: Languages.t('components.alert.leave_private_channel.title'),
              text: Languages.t('components.alert.leave_private_channel.description'),
            });
          }
          if (isDirectChannel(props.channel.visibility)) {
            return leaveChannel(true);
          }
        }

        return leaveChannel();
      },
    },
  ];

  if (props.channel.visibility && isDirectChannel(props.channel.visibility) === false) {
    menu.unshift({
      type: 'menu',
      text: Languages.t('scenes.apps.messages.left_bar.stream.notifications'),
      submenu: [
        {
          text: Languages.t('scenes.apps.messages.left_bar.stream.notifications.all'),
          icon: props.channel.user_member?.notification_level === 'all' && 'check',
          onClick: () => {
            changeNotificationPreference('all');
          },
        },
        {
          text: Languages.t('scenes.apps.messages.left_bar.stream.notifications.mentions', [
            '@all',
            '@here',
            `@[you]`,
          ]),
          icon: props.channel.user_member?.notification_level === 'mentions' && 'check',
          onClick: () => {
            changeNotificationPreference('mentions');
          },
        },
        {
          text: Languages.t('scenes.apps.messages.left_bar.stream.notifications.me', [`@[you]`]),
          icon: props.channel.user_member?.notification_level === 'me' && 'check',
          onClick: () => {
            changeNotificationPreference('me');
          },
        },
        {
          text: Languages.t('scenes.apps.messages.left_bar.stream.notifications.never'),
          icon: props.channel.user_member?.notification_level === 'none' && 'check',
          onClick: () => {
            changeNotificationPreference('none');
          },
        },
      ],
    });
    menu.splice(
      4,
      0,
      {
        type: 'menu',
        hide: !(
          AccessRightsService.hasLevel(workspaceId, 'member') &&
          AccessRightsService.getCompanyLevel(companyId) !== 'guest'
        ),
        text: Languages.t('scenes.app.channelsbar.modify_channel_menu'),
        onClick: () => editChannel(),
      },
      {
        type: 'menu',
        text: Languages.t('scenes.apps.parameters.workspace_sections.members'),
        onClick: () => displayMembers(),
      },
      {
        type: 'menu',
        text: Languages.t('scenes.app.channelsbar.guest_management'),
        hide: AccessRightsService.getCompanyLevel(companyId) === 'guest',
        onClick: () => displayGuestManagement(),
      },
    );
  }

  if (props.channel.visibility && isDirectChannel(props.channel.visibility) === false) {
    menu.push({
      type: 'menu',
      hide:
        currentUser?.id !== props.channel.owner &&
        !AccessRightsService.hasLevel(workspaceId, 'moderator'),
      text: Languages.t('scenes.app.channelsbar.channel_removing'),
      className: 'danger',
      onClick: () => {
        AlertManager.confirm(() => removeChannel());
      },
    });
  }

  return (
    <>
      {!!menu.length && (
        <div className="more-icon">
          <Menu menu={menu} className="options" onClose={props.onClose}>
            <Icon type="ellipsis-h more-icon grey-icon" onClick={props.onClick} />
          </Menu>
        </div>
      )}
    </>
  );
};
