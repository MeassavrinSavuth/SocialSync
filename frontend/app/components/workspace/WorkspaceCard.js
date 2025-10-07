import React from 'react';
import Image from 'next/image';
import { FaTrash } from 'react-icons/fa';

export default function WorkspaceCard({ avatar, name, admin, onClick, isAdmin, onDelete }) {
  return (
    <div
      className="h-full rounded-2xl ring-1 ring-black/5 bg-white shadow-sm p-5 flex flex-col items-center justify-start gap-3 hover:shadow-md transition cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
      onClick={onClick}
    >
      {isAdmin && (
        <button
          className="absolute top-2 right-2 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition z-10 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
          onClick={e => { e.stopPropagation(); onDelete && onDelete(); }}
          title="Delete Workspace"
        >
          <FaTrash className="text-sm md:text-base" />
        </button>
      )}
      <Image
        src={avatar}
        alt={name}
        width={56}
        height={56}
        className="w-14 h-14 rounded-full ring-1 ring-black/5 object-cover bg-gray-100"
      />
      <div className="text-base font-semibold text-gray-900 truncate text-center">{name}</div>
      <div className="text-sm text-muted-foreground text-center">
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 text-gray-700 text-xs px-2 py-0.5">
          Admin: {admin}
        </span>
      </div>
    </div>
  );
} 