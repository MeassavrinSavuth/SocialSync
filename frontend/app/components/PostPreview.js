// components/PostPreview.js
import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

export default function PostPreview({ postContent, postMedia, previewAccount }) {
    return (
        // Changed bg-gray-800 to gray-800, border to gray-700
        <div className="bg-gray-800 p-6 flex flex-col border-l border-gray-700">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-100">Post Preview</h3> {/* Ensure text is light */}
                <FaInfoCircle className="text-gray-400" />
            </div>

            <div className="flex-grow bg-gray-700 rounded-lg p-4 flex flex-col justify-center items-center text-center overflow-auto">
                {previewAccount ? (
                    <>
                        <div className="flex items-center mb-4 w-full">
                            <img src={previewAccount.img} alt={previewAccount.name} className="w-10 h-10 rounded-full mr-3" />
                            <span className="font-semibold text-gray-100">{previewAccount.name}</span> {/* Light text */}
                            <span className="ml-auto text-gray-400 text-xs capitalize">{previewAccount.platform}</span> {/* Muted text */}
                        </div>
                        <div className="w-full text-left">
                            <p className="text-gray-100 text-sm mb-3 whitespace-pre-wrap break-words">{postContent || "Your drafted content will appear here..."}</p>
                            {postMedia.length > 0 && (
                                <div className="grid grid-cols-1 gap-2 mt-2">
                                    {postMedia.map((file, index) => (
                                        <div key={index} className="w-full h-auto max-h-64 overflow-hidden rounded-md">
                                            {file.type.startsWith('image/') ? (
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="post media"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <video src={URL.createObjectURL(file)} className="w-full h-full object-contain" controls />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-4 text-gray-400 text-xs flex justify-between">
                                <span>0 Likes</span>
                                <span>0 Comments</span>
                                <span>0 Shares</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-gray-400 text-center">
                        <p className="mb-2">Select a social account</p>
                        <p>and start typing to see your post preview.</p>
                        <p className="mt-4 text-sm">Preview will reflect selected platform's typical layout.</p>
                    </div>
                )}
            </div>
        </div>
    );
}