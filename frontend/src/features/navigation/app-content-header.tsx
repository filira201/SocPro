import { Fragment } from "react";
import { Link, useLocation } from "react-router";

import {
  breadcrumbSegmentsFromPath,
  extractProfileUserIdFromPathname,
} from "./lib/breadcrumb-from-path";

import {
  displayPublicName,
  selectCurrentUser,
  useGetUserByIdQuery,
} from "@/features/auth";
import { useAppSelector } from "@/shared/lib/redux";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/kit/breadcrumb";
import { Separator } from "@/shared/ui/kit/separator";
import { SidebarTrigger } from "@/shared/ui/kit/sidebar";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export function AppContentHeader() {
  const location = useLocation();
  const currentUser = useAppSelector(selectCurrentUser);

  const profileUserId = extractProfileUserIdFromPathname(location.pathname);

  const { data: profileUserForCrumb } = useGetUserByIdQuery(
    profileUserId ?? "",
    {
      skip: !profileUserId || profileUserId === currentUser?.id,
    }
  );

  const profileCrumbLabel =
    !profileUserId
      ? undefined
      : profileUserId === currentUser?.id
        ? "Ваш профиль"
        : profileUserForCrumb
          ? displayPublicName(profileUserForCrumb)
          : undefined;

  const segments = breadcrumbSegmentsFromPath(location.pathname, {
    profileCrumbLabel,
  });

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 w-px shrink-0" />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1;

              return (
                <Fragment key={`${segment.to ?? ""}-${segment.label}-${index}`}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {isLast || !segment.to ? (
                      <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={segment.to}>{segment.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex shrink-0 items-center px-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
