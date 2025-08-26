import React from "react"
import Avatar from "@/components/dashboard/ui/avatar/Avatar"
import { Icons } from "@/components/shared/icons"

// Define local types to avoid external dependencies
interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

interface UserAvatarProps extends AvatarProps {
  user: Pick<User, "image" | "name">
}

export function UserAvatar({ user, className, ...props }: UserAvatarProps) {
  if (user.image) {
    return (
      <Avatar
        src={user.image}
        alt={user.name || "User Avatar"}
        size="medium"
        {...props}
      />
    )
  }

  // Fallback for users without image
  return (
    <div className={`relative h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center ${className || ''}`} {...props}>
      <span className="sr-only">{user.name}</span>
      <Icons.user className="h-4 w-4 text-gray-600" />
    </div>
  )
}
