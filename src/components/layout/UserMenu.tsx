import { LogOut, Moon, Sun, Laptop, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import type { ThemePreference } from "@/types";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function UserMenu() {
  const { user, signOutUser } = useAuth();
  const { settings, update } = useSettings();

  const initials = (user?.displayName ?? user?.email ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar>
          {user?.photoURL && <AvatarImage src={user.photoURL} alt="" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{user?.displayName ?? "Account"}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => update({ theme: value })}
            className={settings.theme === value ? "bg-accent" : ""}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/help">
            <HelpCircle className="mr-2 h-4 w-4" />
            How to use
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await signOutUser();
            toast.success("Signed out");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
