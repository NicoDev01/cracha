"use client";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Coins, LifeBuoy, LogOut, UserRound } from "lucide-react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuthStore } from "@/stores/auth-store";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const router = useRouter();

function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
  e.stopPropagation();
  setIsOpen((prev) => !prev);
}

  function closeDropdown() {
    setIsOpen(false);
  }
  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        aria-label="Kontomenü öffnen"
        title="Kontomenü öffnen"
        aria-expanded={isOpen}
        className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
      >
        <span className="mr-1 sm:mr-3 overflow-hidden rounded-full h-10 w-10">
          <Image
            width={44}
            height={44}
            src="/images/user/user-placeholder.jpg"
            alt=""
          />
        </span>

        {user?.name?.trim() ? (
          <span className="hidden sm:block max-w-32 truncate mr-1 font-medium text-theme-sm">
            {user?.name}
          </span>
        ) : (
          <span className="hidden sm:block max-w-32 truncate mr-1 font-medium text-theme-sm">
            {user?.email ?? ""}
          </span>
        )}

        <ChevronDown
          className={`size-4 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          {user?.name?.trim() && (
            <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
              {user?.name}
            </span>
          )}
          {user?.email && (
            <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
              {user?.email}
            </span>
          )}
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/dashboard/account"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <UserRound className="size-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" aria-hidden="true" />
              Mein Konto
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/dashboard#guthaben"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <Coins className="size-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" aria-hidden="true" />
              Guthaben & Buchungen
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href={`mailto:${siteConfig.mailSupport}`}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <LifeBuoy className="size-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" aria-hidden="true" />
              Support
            </DropdownItem>
          </li>
        </ul>
        <button
          onClick={async () => {
            closeDropdown();
            try {
              await logout();
              router.push('/login');
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 w-full text-left"
        >
          <LogOut className="size-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" aria-hidden="true" />
          Abmelden
        </button>
      </Dropdown>
    </div>
  );
}
