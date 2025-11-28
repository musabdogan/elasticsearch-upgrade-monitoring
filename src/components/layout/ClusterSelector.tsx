'use client';

import { ChevronDown, Edit2, Plus, Server, Trash2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMonitoring } from '@/context/MonitoringProvider';
import type { ClusterConnection, CreateClusterInput } from '@/types/app';

const initialForm: CreateClusterInput = {
  label: '',
  baseUrl: '',
  username: '',
  password: ''
};

export function ClusterSelector() {
  const {
    clusters,
    activeCluster,
    setActiveCluster,
    addCluster,
    updateCluster,
    deleteCluster
  } = useMonitoring();
  const [form, setForm] = useState<CreateClusterInput>(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering client-side content after mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure this runs after initial render
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  const handleEdit = (cluster: ClusterConnection) => {
    setForm({
      label: cluster.label,
      baseUrl: cluster.baseUrl,
      username: cluster.username,
      password: cluster.password
    });
    setEditingId(cluster.id);
    setShowForm(true);
    setShowDropdown(false);
    setFormError(null);
  };

  const handleCancel = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
    setFormError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.baseUrl) {
      setFormError('URL:PORT is required.');
      return;
    }

    try {
      const url = new URL(form.baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        setFormError('URL must start with http:// or https://');
        return;
      }
    } catch {
      setFormError('Invalid URL format. Use http://host:port or https://host:port');
      return;
    }

    if (editingId) {
      updateCluster(editingId, form);
    } else {
      addCluster(form);
    }
    handleCancel();
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
          <Server className="h-3.5 w-3.5" />
          <span className="font-medium">Cluster:</span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            <span className="max-w-[120px] truncate">
              {mounted ? (activeCluster?.label || 'Select cluster') : 'Select cluster'}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showDropdown && clusters.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="max-h-64 overflow-y-auto p-1">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${
                      activeCluster?.id === cluster.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCluster(cluster.id);
                        setShowDropdown(false);
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {cluster.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {cluster.baseUrl}
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(cluster)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                        aria-label={`Edit ${cluster.label}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete cluster "${cluster.label}"? This action cannot be undone.`
                            )
                          ) {
                            deleteCluster(cluster.id);
                            setShowDropdown(false);
                          }
                        }}
                        className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        aria-label={`Delete ${cluster.label}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 p-1 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(true);
                    setShowDropdown(false);
                  }}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Plus className="h-3 w-3" />
                  Add Cluster
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {editingId ? 'Edit Cluster' : 'Add Cluster'}
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                  className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="e.g. Production"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  URL:PORT *
                </label>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, baseUrl: event.target.value }))}
                  className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="http://localhost:9200"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Username (optional)
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="elastic (optional)"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Password (optional)
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="•••••••• (optional)"
                />
              </div>
              {formError && (
                <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
