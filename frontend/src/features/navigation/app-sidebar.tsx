import {
  Bell,
  FolderKanban,
  LayoutList,
  LogOut,
  User,
  UserSearch,
  Users,
  UsersRound,
} from "lucide-react";
import {
  href,
  Link,
  matchPath,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router";

import {
  displayPublicName,
  logout,
  selectCurrentUser,
  userInitials,
  useCurrentQuery,
} from "@/features/auth";
import { useGetUnreadNotificationCountQuery } from "@/features/notifications/api/notifications.api";
import { toAbsoluteUploadUrl } from "@/features/posts/lib/format";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/shared/ui/kit/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/kit/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/shared/ui/kit/sidebar";

const navSidebarMenuButtonClassName =
  "data-active:shadow-sm data-active:ring-2 data-active:ring-primary/35 dark:data-active:ring-sidebar-ring/50 data-active:[&_svg]:stroke-[2.5] data-active:[&_svg]:text-sidebar-primary data-active:[&_svg]:fill-current";

export function AppSidebar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const currentUser = useAppSelector(selectCurrentUser);

  useCurrentQuery();
  const { data: unreadData } = useGetUnreadNotificationCountQuery(undefined, {
    skip: !currentUser,
    pollingInterval: 45_000,
  });
  const unreadCount = unreadData?.count ?? 0;
  const hasUnread = unreadCount > 0;

  const posts = {
    title: "Посты",
    to: ROUTES.POSTS,
    icon: LayoutList,
    end: true as const,
  };

  const projects = {
    title: "Проекты",
    to: ROUTES.PROJECTS,
    icon: FolderKanban,
    end: true as const,
  };

  const usersDirectory = {
    title: "Пользователи",
    to: ROUTES.USERS,
    icon: UserSearch,
    end: true as const,
  };

  const navItems = !currentUser
    ? [posts]
    : [
        posts,
        projects,
        usersDirectory,
        {
          title: "Подписчики",
          to: href(ROUTES.FOLLOWERS, { userId: currentUser.id }),
          icon: Users,
          end: true as const,
        },
        {
          title: "Подписки",
          to: href(ROUTES.FOLLOWING, { userId: currentUser.id }),
          icon: UsersRound,
          end: true as const,
        },
      ];

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const profilePath = currentUser
    ? href(ROUTES.USER_DETAILS, { userId: currentUser.id })
    : ROUTES.POSTS;

  const avatarSrc = currentUser?.avatarUrl
    ? toAbsoluteUploadUrl(currentUser.avatarUrl)
    : "";

  const publicName = currentUser ? displayPublicName(currentUser) : "";
  const initials = currentUser ? userInitials(currentUser) : "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink
                to={ROUTES.POSTS}
                className="font-heading font-semibold"
                end
              >
                <span className="truncate">СоцПро</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={`${item.title}-${item.to}`}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    className={navSidebarMenuButtonClassName}
                    isActive={Boolean(
                      matchPath(
                        { path: item.to, end: item.end },
                        location.pathname
                      )
                    )}
                  >
                    <NavLink to={item.to} end={item.end}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {currentUser ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="relative size-8 rounded-lg">
                      <AvatarImage src={avatarSrc} alt={publicName} />
                      <AvatarFallback className="rounded-lg text-xs">
                        {initials}
                      </AvatarFallback>
                      {hasUnread ? (
                        <AvatarBadge
                          className="bg-green-600 dark:bg-green-800"
                          title={`Непрочитанных: ${unreadCount}`}
                        />
                      ) : null}
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium">{publicName}</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="relative size-8 rounded-lg">
                        <AvatarImage src={avatarSrc} alt={publicName} />
                        <AvatarFallback className="rounded-lg text-xs">
                          {initials}
                        </AvatarFallback>
                        {hasUnread ? (
                          <AvatarBadge
                            className="bg-green-600 dark:bg-green-800"
                            title={`Непрочитанных: ${unreadCount}`}
                          />
                        ) : null}
                      </Avatar>
                      <span className="truncate font-medium">{publicName}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link to={profilePath}>
                        <User />
                        Профиль
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to={ROUTES.NOTIFICATIONS}
                        className="flex w-full items-center gap-2"
                      >
                        <Bell />
                        <span className="flex-1">Уведомления</span>
                        {hasUnread ? (
                          <span
                            className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-green-600 px-1.5 py-0.5 text-[0.75rem] font-semibold tabular-nums leading-none text-white!"
                            aria-label={`Непрочитанных: ${unreadCount}`}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut />
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
