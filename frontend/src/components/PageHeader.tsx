import React from "react";
import { UserIcon } from "./UserIcon";

export const PageHeader: React.FC<{ title: React.ReactNode; showUserIcon?: boolean; children?: React.ReactNode }> = ({ title, showUserIcon = true, children }) => (
  <div className="flex items-center p-6 border-b border-[#334155]">
    <div className="w-8" />
    <h1 className="flex-1 text-center text-2xl font-bold text-white">{title}</h1>
    {showUserIcon ? <UserIcon /> : <div className="w-8" />}
    {children}
  </div>
);