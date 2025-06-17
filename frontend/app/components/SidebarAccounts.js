// components/SidebarAccounts.js
import React, { useState } from 'react';
import { FaSearch, FaPlus, FaEye } from 'react-icons/fa';

export default function SidebarAccounts({ accounts, selectedAccounts, onAccountToggle, onSelectPreviewAccount, previewAccount }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAccounts = accounts.filter(account =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) || account.platform.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        // Changed bg-gray-800 to a darker shade, border to gray-700
        <div className="bg-gray-800 p-4 flex flex-col border-r border-gray-700">
            <div className="relative mb-4">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    // Changed bg-gray-700 to gray-700, border to gray-600, text/placeholder to lighter grays
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-accent"
                />
            </div>
            <div className="flex-grow overflow-y-auto">
                {filteredAccounts.map(account => (
                    <div
                        key={account.id}
                        className={`flex items-center p-3 mb-2 rounded-md cursor-pointer transition-colors duration-200
                                    ${selectedAccounts.includes(account.id) ? 'bg-gray-700 text-gray-100' : 'bg-gray-800 hover:bg-gray-700'}
                                    ${selectedAccounts.includes(account.id) ? 'border-l-4 border-blue-accent' : ''} /* Added left border for selection */
                                    ${previewAccount && previewAccount.id === account.id && !selectedAccounts.includes(account.id) ? 'border-2 border-gray-600' : ''} /* Subtle border for preview only */
                                `}
                        onClick={() => onAccountToggle(account.id)}
                    >
                        <input
                            type="checkbox"
                            checked={selectedAccounts.includes(account.id)}
                            readOnly
                            // Adjusted checkbox colors
                            className="form-checkbox h-4 w-4 text-blue-accent rounded mr-3 bg-gray-700 border-gray-500 focus:ring-blue-accent"
                        />
                        <img src={account.img} alt={account.name} className="w-8 h-8 rounded-full mr-3" />
                        <span className="text-sm font-medium text-gray-100">{account.name}</span> {/* Ensured text is light */}
                        {/* Preview button for explicit preview selection */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onSelectPreviewAccount(account); }}
                            className={`ml-auto p-1 rounded-full hover:bg-gray-700 transition-colors duration-200
                                        ${previewAccount && previewAccount.id === account.id ? 'text-blue-accent' : 'text-gray-400'}
                                    `}
                            title="Set as preview"
                        >
                            <FaEye className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            {/* Changed button colors to blue-accent */}
            <button className="mt-4 bg-blue-accent hover:bg-blue-hover text-white font-semibold py-2 px-4 rounded-md flex items-center justify-center transition-colors duration-200">
                <FaPlus className="mr-2" /> Add Account
            </button>
        </div>
    );
}