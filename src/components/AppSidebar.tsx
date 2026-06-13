import { NavLink } from "@/components/NavLink";
import chameleonLogo from "@/assets/chameleon-logo.png";
import { ALL_MENUS } from "@/lib/admin";
import { useMyPermissions } from "@/hooks/useCoachPermissions";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { canAccess } = useMyPermissions();

  const visibleItems = ALL_MENUS.filter((m) => canAccess(m.key));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={chameleonLogo} alt="Chameleon Coach" width={36} height={36} className="shrink-0" />
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-sidebar-primary-foreground">Chameleon</h1>
              <p className="text-xs text-sidebar-foreground">Coach</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/50">© 2026 Chameleon Coach</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
