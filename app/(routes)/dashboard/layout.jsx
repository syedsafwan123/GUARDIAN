"use client";
import React, { useState } from "react";
import SideNav from "./_components/SideNav";
import DashboardHeader from "./_components/DashboardHeader";

function DashboardLayout({ children }) {
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);



  const toggleSideNav = () => {
    setIsSideNavOpen(!isSideNavOpen);
  };

  const closeSideNav = () => {
    setIsSideNavOpen(false);
  };

  return (
    <div className="relative">
      {isSideNavOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={closeSideNav}
        ></div>
      )}
      <div
        className={`fixed z-20 md:w-64 ${
          isSideNavOpen ? "block" : "hidden"
        } md:block`}
      >
        <SideNav isSideNavOpen={isSideNavOpen} onClose={closeSideNav} />
      </div>
      <div className="md:ml-64">
        <DashboardHeader onMenuClick={toggleSideNav} />
        {children}
      </div>
    </div>
  );
}

export default DashboardLayout;
