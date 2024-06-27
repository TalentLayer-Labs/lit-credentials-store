"use client";

import { UserIcon } from "@heroicons/react/24/outline";

import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
  WrappedLink,
} from "./ui/dropdown";

export const UserMenu = () => {
  return (
    <div className="flex justify-center">
      <Dropdown className="inline-flex">
        <DropdownTrigger className="rounded-full p-2 hover:bg-slate-200">
          <UserIcon className="size-5" />
        </DropdownTrigger>
        <DropdownContent className="mt-4 p-1.5">
          <hr className="my-2 h-px border-0 bg-slate-200" />
          <DropdownItem href="/account" as={WrappedLink} className="py-1.5">
            Account
          </DropdownItem>
          <DropdownItem className="py-1.5">Sign out</DropdownItem>
        </DropdownContent>
      </Dropdown>
    </div>
  );
};
