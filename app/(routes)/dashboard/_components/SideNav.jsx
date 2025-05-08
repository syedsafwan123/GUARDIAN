"use client";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutGrid,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  X,
  TrendingUp
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

function SideNav({ isSideNavOpen, onClose }) {
  const menuList = [
    {
      id: 1,
      name: "Dashboard",
      icon: LayoutGrid,
      path: "/dashboard",
    },  
    {
      id: 2,
      name: "Community ",
      icon: ReceiptText,
      path: "/dashboard/communityAlert", 
    },    
    {
      id: 3,
      name: "Zone Report ",
      icon: ReceiptText,
      path: "/dashboard/zoneReport", 
    },
    {
      id: 4,
      name: "AI Assistant ",
      icon: ReceiptText,
      path: "/dashboard/aiAssistant", 
    },
  ];

  const path = usePathname();

  return (
    <div className="h-screen p-5 border shadow-sm bg-white">
      <div className="flex justify-between items-center">
        <Image src={"/logo.jpg"} alt="logo" width={160} height={100} />
        <button className="md:hidden p-2" onClick={onClose}>
          <X />
        </button>
      </div>

      <div className="mt-5">
        {menuList.map((menu) => (
          <Link href={menu.path} key={menu.id} onClick={onClose}>
            <h2
              className={`flex gap-2 text-gray-500 items-center font-medium mb-2 p-5 cursor-pointer rounded-md hover:text-primary hover:bg-blue-100 ${
                path == menu.path && "text-primary bg-blue-100"
              }`}
            >
              <menu.icon />
              {menu.name}
            </h2>
          </Link>
        ))}
      </div>

      <div className="fixed bottom-10 p-5 flex gap-2 items-center">
        <UserButton />
        Profile
      </div>
    </div>
  );
}

export default SideNav;