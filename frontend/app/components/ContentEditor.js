// components/ContentEditor.js
import React, { useState, useCallback } from 'react';
import { FaBold, FaItalic, FaLink, FaImage, FaVideo, FaSmile, FaCalendarAlt, FaEllipsisH } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function ContentEditor({
    postContent, onContentChange,
    postMedia, onMediaChange,
    postLabels, onLabelsChange,
    onDraft, onPublish, onSchedule,
    scheduledDateTime, onScheduleChange
}) {
    const [isScheduling, setIsScheduling] = useState(false);

    const onDrop = useCallback(acceptedFiles => {
        onMediaChange(prevMedia => [...prevMedia, ...acceptedFiles]);
    }, [onMediaChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.png', '.gif'],
            'video/*': ['.mp4', '.mov', '.avi']
        },
        multiple: true
    });

    const removeMedia = (indexToRemove) => {
        onMediaChange(prevMedia => prevMedia.filter((_, index) => index !== indexToRemove));
    };

    return (
        // Changed bg-gray-900 to gray-900, border to gray-700
        <div className="flex flex-col bg-gray-900 p-6 border-r border-gray-700">
            {/* Header: Labels & Close Button */}
            <div className="flex items-center justify-between mb-4">
                <input
                    type="text"
                    placeholder="Add labels (comma separated)"
                    value={postLabels}
                    onChange={onLabelsChange}
                    // Changed bg-gray-800 to gray-800, border to gray-700, text/placeholder to lighter grays
                    className="flex-grow px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-accent mr-4"
                />
                <button className="text-gray-400 hover:text-gray-200 text-xl font-bold transition-colors duration-200">
                    &times;
                </button>
            </div>

            {/* Content Textarea */}
            <div className="flex-grow mb-4">
                <textarea
                    placeholder="Write something or use shortcodes, spintax..."
                    value={postContent}
                    onChange={(e) => onContentChange(e.target.value)}
                    // Changed bg-gray-800 to gray-800, border to gray-700, text/placeholder to lighter grays, h-48 for fixed height
                    className="w-full h-48 p-3 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-accent resize-none"
                />
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded-md mb-4">
                <div className="flex space-x-2">
                    {/* Changed bg-gray-700 to gray-700, text to gray-200 */}
                    <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-200 text-sm transition-colors duration-200">
                        # Hashtags
                    </button>
                    <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-200 text-sm transition-colors duration-200">
                        AI Assist
                    </button>
                </div>
                <div className="flex space-x-2">
                    {/* Changed icon colors */}
                    <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200"><FaBold /></button>
                    <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200"><FaItalic /></button>
                    <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200"><FaLink /></button>
                    <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200"><FaImage /></button>
                    <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200"><FaVideo /></button>
                    <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200"><FaSmile /></button>
                </div>
            </div>

            {/* Media Dropzone */}
            <div {...getRootProps()} className="border-2 border-dashed border-gray-700 rounded-md p-6 text-center cursor-pointer mb-6 hover:border-blue-accent transition-colors duration-200 relative">
                <input {...getInputProps()} />
                {isDragActive ?
                    <p className="text-gray-300">Drop the files here ...</p> :
                    <p className="text-gray-400">Click or Drag & Drop media</p>
                }
                {postMedia.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {postMedia.map((file, index) => (
                            <div key={index} className="relative group">
                                {file.type.startsWith('image/') ? (
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="preview"
                                        className="w-full h-24 object-cover rounded-md"
                                    />
                                ) : (
                                    <video src={URL.createObjectURL(file)} className="w-full h-24 object-cover rounded-md" controls />
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeMedia(index); }}
                                    className="absolute top-1 right-1 bg-gray-800 text-gray-300 rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-700"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer: Bulk Options & Action Buttons */}
            <div className="flex justify-between items-center mt-auto">
                <div className="relative">
                    {/* Changed bg-gray-700 to gray-700, text to gray-200 */}
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md flex items-center transition-colors duration-200">
                        Bulk Options <FaEllipsisH className="ml-2" />
                    </button>
                    {/* Dropdown content for Bulk Options would go here */}
                </div>
                <div className="flex space-x-3 relative">
                    {/* Changed button colors */}
                    <button
                        onClick={onDraft}
                        className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-md transition-colors duration-200"
                    >
                        Draft
                    </button>
                    <button
                        onClick={onPublish}
                        className="px-5 py-2 bg-blue-accent hover:bg-blue-hover text-white font-semibold rounded-md transition-colors duration-200"
                    >
                        Publish
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setIsScheduling(!isScheduling)}
                            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-md transition-colors duration-200 flex items-center"
                        >
                            Schedule <FaCalendarAlt className="ml-2" />
                        </button>
                        {isScheduling && (
                            // Changed popup colors
                            <div className="absolute bottom-full right-0 mb-2 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                                <DatePicker
                                    selected={scheduledDateTime}
                                    onChange={(date) => onScheduleChange(date)}
                                    showTimeSelect
                                    dateFormat="Pp"
                                    inline
                                    // Custom classes for datepicker styling
                                    className="bg-gray-700 text-gray-100"
                                    calendarClassName="tailwind-datepicker-calendar"
                                    dayClassName={() => "text-gray-100"}
                                />
                                <button
                                    onClick={() => { onSchedule(); setIsScheduling(false); }}
                                    className="mt-3 w-full py-2 bg-blue-accent hover:bg-blue-hover text-white rounded-md transition-colors duration-200"
                                >
                                    Confirm Schedule
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}