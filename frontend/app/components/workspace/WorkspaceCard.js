import React from 'react';
import { FaTrash } from 'react-icons/fa';

export default function WorkspaceCard({ avatar, name, admin, onClick, isAdmin, onDelete }) {
  return (
    <div
      className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 flex flex-col items-center border hover:shadow-xl transition cursor-pointer relative min-h-[160px] md:min-h-[180px]"
      onClick={onClick}
    >
      {isAdmin && (
        <button
          className="absolute top-2 right-2 p-1.5 md:p-2 bg-red-100 hover:bg-red-200 rounded-full text-red-600 hover:text-red-800 transition z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={e => { e.stopPropagation(); onDelete && onDelete(); }}
          title="Delete Workspace"
        >
          <FaTrash className="text-sm md:text-base" />
        </button>
      )}
      <img
        src={avatar}
        alt={name}
        className="w-16 h-16 md:w-20 md:h-20 rounded-full border mb-3 md:mb-4 object-cover bg-gray-100"
      />
      <div className="text-lg md:text-xl font-semibold text-gray-800 mb-1 text-center break-words">{name}</div>
      <div className="text-gray-500 text-xs md:text-sm mb-2 text-center">Admin: <span className="font-medium break-words">{admin}</span></div>
    </div>
  );
} 