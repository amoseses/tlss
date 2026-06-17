'use client';

import { useState } from 'react';
import { Check, X, AlertCircle, Eye } from 'lucide-react';
import { ImportJob, ImportJobItem } from '../schema';

interface ImportJobStatusProps {
  job: ImportJob;
  items: ImportJobItem[];
  onApproveItem?: (itemId: number) => void;
  onRejectItem?: (itemId: number, reason: string) => void;
}

export function ImportJobStatus({
  job,
  items,
  onApproveItem,
  onRejectItem,
}: ImportJobStatusProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpand = (itemId: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      newSet.has(itemId) ? newSet.delete(itemId) : newSet.add(itemId);
      return newSet;
    });
  };

  const pendingItems = items.filter((i) => i.status === 'extracted');
  const approvedItems = items.filter((i) => i.status === 'approved');
  const rejectedItems = items.filter((i) => i.status === 'rejected');

  return (
    <div className="w-full space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="text-2xl font-bold text-blue-900">{job.totalRows}</div>
          <div className="text-sm text-blue-700">Total Items</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <div className="text-2xl font-bold text-green-900">{job.successCount}</div>
          <div className="text-sm text-green-700">Approved</div>
        </div>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-2xl font-bold text-yellow-900">{pendingItems.length}</div>
          <div className="text-sm text-yellow-700">Pending Review</div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <div className="text-2xl font-bold text-red-900">{job.failureCount}</div>
          <div className="text-sm text-red-700">Failed</div>
        </div>
      </div>

      {/* Pending Items */}
      {pendingItems.length > 0 && (
        <div className="border border-gray-200 rounded">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Pending Review ({pendingItems.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingItems.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">Row {item.rowIndex}</p>
                    <p className="text-sm text-gray-600 break-all">{item.url}</p>
                  </div>
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Eye size={18} />
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedItems.has(item.id) && item.extractedData && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm space-y-2 mb-3">
                    <div>
                      <span className="font-medium text-gray-700">Title:</span>
                      <p className="text-gray-600">{item.extractedData.title}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Price:</span>
                      <p className="text-gray-600">${(item.extractedData.price / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Description:</span>
                      <p className="text-gray-600 line-clamp-3">{item.extractedData.description}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onApproveItem?.(item.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button
                    onClick={() => onRejectItem?.(item.id, 'Manual rejection')}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Items */}
      {approvedItems.length > 0 && (
        <div className="border border-green-200 rounded bg-green-50">
          <div className="p-4 border-b border-green-200">
            <h3 className="font-semibold text-green-900">
              ✓ Approved ({approvedItems.length})
            </h3>
          </div>
        </div>
      )}
    </div>
  );
}
