import {
  Bell,
  LayoutList,
  LogOut,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";

import { logout, selectCurrentUser, useCurrentQuery } from "@/features/auth";
import { toAbsoluteUploadUrl } from "@/features/posts/lib/format";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
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

const navItems = [
  {
    title: "Посты",
    to: ROUTES.POSTS,
    icon: LayoutList,
    end: true,
  },
  {
    title: "Подписчики",
    to: ROUTES.FOLLOWERS,
    icon: Users,
    end: true,
  },
  {
    title: "Подписки",
    to: ROUTES.FOLLOWING,
    icon: UsersRound,
    end: true,
  },
] as const;

export function AppSidebar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const currentUser = useAppSelector(selectCurrentUser);

  useCurrentQuery();

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const profilePath = currentUser
    ? ROUTES.USER_DETAILS.replace(":userId", currentUser.id)
    : ROUTES.POSTS;

  const avatarSrc = currentUser?.avatarUrl
    ? toAbsoluteUploadUrl(currentUser.avatarUrl)
    : "";

  const initials = currentUser?.username.slice(0, 2).toUpperCase() ?? "?";

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
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.title}>
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
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={avatarSrc} alt={currentUser.username} />
                      <AvatarFallback className="rounded-lg text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium">
                        @{currentUser.username}
                      </span>
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
                      <Avatar className="size-8 rounded-lg">
                        <AvatarImage
                          src={avatarSrc}
                          alt={currentUser.username}
                        />
                        <AvatarFallback className="rounded-lg text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium">
                        @{currentUser.username}
                      </span>
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
                      <Link to={ROUTES.NOTIFICATIONS}>
                        <Bell />
                        Уведомления
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
