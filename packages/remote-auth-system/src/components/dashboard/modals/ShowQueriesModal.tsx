import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, RefreshCw, Send, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllMessages, updateTicket } from '../../../api/SpendApi';
import { getMyProfile } from '../../../api/userApi';
import SpinnerLoaders from '../../SpinnerLoaders';

export interface QueryThread {
  id: number;
  message_id: number;
  from: string;
  to: string[] | string;
  title: string;
  message: string;
  messages?: Record<string, string>;
  created_on: string;
  updated_on?: string;
  status: string;
}

interface ShowQueriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRaiseQuery?: () => void;
}

export const ShowQueriesModal: React.FC<ShowQueriesModalProps> = React.memo(({
  isOpen,
  onClose,
  onOpenRaiseQuery
}) => {
  const [currentUser, setCurrentUser] = useState<string>('');
  const [threads, setThreads] = useState<QueryThread[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // 1. Fetch current user profile & all messages
  const fetchMessagesList = useCallback(async () => {
    setLoading(true);
    try {
      let aribaUser = currentUser;
      if (!aribaUser) {
        const profile: any = await getMyProfile();
        if (profile) {
          aribaUser = profile.aribaUserName || profile.ariba_user_name || profile.aribaUsername || profile.email || profile.name || '';
          if (aribaUser) setCurrentUser(aribaUser);
        }
      }

      const reqPayload: any = {};
      if (aribaUser && aribaUser.trim()) {
        reqPayload.from = aribaUser.trim();
      }

      const res = await getAllMessages(reqPayload);

      if (res && (res.status === 'success' || res.status === 200) && Array.isArray(res.data)) {
        setThreads(res.data);
        if (res.data.length > 0 && selectedThreadId === null) {
          setSelectedThreadId(res.data[0].message_id);
        }
      } else {
        setThreads([]);
      }
    } catch (err) {
      console.error('Failed to fetch messages list:', err);
      toast.error('Could not load query messages.');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedThreadId]);

  useEffect(() => {
    if (isOpen) {
      fetchMessagesList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredThreads = threads.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (t.title || '').toLowerCase().includes(q);
    const msgMatch = (t.message || '').toLowerCase().includes(q);
    const fromMatch = (t.from || '').toLowerCase().includes(q);
    const idMatch = String(t.message_id || '').includes(q);
    return titleMatch || msgMatch || fromMatch || idMatch;
  });

  const selectedThread = threads.find(t => t.message_id === selectedThreadId) || (filteredThreads.length > 0 ? filteredThreads[0] : null);

  // Send reply handler
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread) return;
    if (!replyText.trim()) {
      toast.warn('Please enter a reply message.');
      return;
    }

    setSendingReply(true);
    try {
      let targetTo = '';
      const me = (currentUser || '').trim().toLowerCase();

      if (Array.isArray(selectedThread.to)) {
        const otherInTo = selectedThread.to.find(u => u && u.trim().toLowerCase() !== me);
        if (otherInTo) {
          targetTo = otherInTo.trim();
        } else if (selectedThread.from && selectedThread.from.trim().toLowerCase() !== me) {
          targetTo = selectedThread.from.trim();
        } else {
          targetTo = selectedThread.to[0] || 'support@chervicaon.com';
        }
      } else if (typeof selectedThread.to === 'string' && selectedThread.to.trim()) {
        const toStr = selectedThread.to.trim();
        if (toStr.toLowerCase() !== me) {
          targetTo = toStr;
        } else if (selectedThread.from && selectedThread.from.trim().toLowerCase() !== me) {
          targetTo = selectedThread.from.trim();
        } else {
          targetTo = toStr;
        }
      }

      if (!targetTo || targetTo.toLowerCase() === me) {
        if (selectedThread.messages && typeof selectedThread.messages === 'object') {
          const msgSender = Object.keys(selectedThread.messages).find(snd => snd && snd.trim().toLowerCase() !== me);
          if (msgSender) targetTo = msgSender.trim();
        }
      }

      if (!targetTo) {
        targetTo = 'support@chervicaon.com';
      }

      const res = await updateTicket({
        message_id: selectedThread.message_id,
        from: currentUser || selectedThread.from,
        to: targetTo,
        add: '',
        message: replyText.trim(),
        status: selectedThread.status || 'IN_PROGRESS'
      });

      if (res && (res.status === 'success' || res.status === 200 || res.message?.includes('success') || res.message?.includes('updated'))) {
        toast.success('Reply sent successfully!');
        setReplyText('');
        if (res.data && res.data.message_id) {
          setThreads(prev => prev.map(t => t.message_id === res.data.message_id ? { ...t, ...res.data } : t));
        }
        await fetchMessagesList();
      } else {
        toast.error(res?.message || 'Failed to send reply.');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      toast.error('Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = () => {
    if (!selectedThread) return;
    setShowConfirmModal(true);
  };

  const handleConfirmCloseTicket = async () => {
    if (!selectedThread) return;
    setSendingReply(true);
    try {
      const res = await updateTicket({
        message_id: selectedThread.message_id,
        status: 'CLOSE'
      });

      if (res && (res.status === 'success' || res.status === 200 || res.message?.includes('success') || res.message?.includes('updated'))) {
        toast.success('Conversation closed successfully!');
        setReplyText('');
        if (res.data && res.data.message_id) {
          setThreads(prev => prev.map(t => t.message_id === res.data.message_id ? { ...t, ...res.data } : t));
        }
        await fetchMessagesList();
      } else {
        toast.error(res?.message || 'Failed to close conversation.');
      }
    } catch (err) {
      console.error('Error closing conversation:', err);
      toast.error('Failed to close conversation. Please try again.');
    } finally {
      setSendingReply(false);
      setShowConfirmModal(false);
    }
  };

  // Helper to parse full chronological conversation thread from raw message string
  const parseFullMessageThread = (rawMsg: string) => {
    if (!rawMsg || typeof rawMsg !== 'string') return [];

    const bubbles: Array<{ sender: string; text: string }> = [];
    const regex = /([^,;\n]+?)\s*->\s*/g;
    let match;
    const indices: Array<{ sender: string; start: number; end: number }> = [];

    while ((match = regex.exec(rawMsg)) !== null) {
      indices.push({
        sender: match[1].trim(),
        start: match.index,
        end: regex.lastIndex
      });
    }

    if (indices.length === 0) {
      bubbles.push({ sender: 'Message', text: rawMsg.trim() });
      return bubbles;
    }

    for (let i = 0; i < indices.length; i++) {
      const current = indices[i];
      const nextStart = i + 1 < indices.length ? indices[i + 1].start : rawMsg.length;
      let text = rawMsg.substring(current.end, nextStart).trim();
      if (text.endsWith(',')) {
        text = text.slice(0, -1).trim();
      }
      if (text) {
        bubbles.push({ sender: current.sender, text });
      }
    }

    return bubbles;
  };

  // Helper to parse message bubbles from thread
  const renderMessageBubbles = (thread: QueryThread) => {
    let bubbles: Array<{ sender: string; text: string }> = [];

    if (thread.message && typeof thread.message === 'string' && thread.message.trim()) {
      bubbles = parseFullMessageThread(thread.message);
    }

    if (bubbles.length === 0 && thread.messages && typeof thread.messages === 'object' && Object.keys(thread.messages).length > 0) {
      Object.entries(thread.messages).forEach(([snd, text]) => {
        if (text && typeof text === 'string') {
          const cleanText = text.includes('->') ? text.split('->').slice(1).join('->') : text;
          bubbles.push({ sender: snd, text: cleanText });
        }
      });
    }

    if (bubbles.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
          No messages in this thread yet.
        </div>
      );
    }

    return bubbles.map((b, idx) => {
      const isMe = b.sender.toLowerCase() === currentUser.toLowerCase() || b.sender === 'me';
      return (
        <div
          key={idx}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMe ? 'flex-end' : 'flex-start',
            marginBottom: '0.875rem'
          }}
        >
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem', padding: '0 0.25rem' }}>
            {b.sender}
          </div>
          <div
            style={{
              maxWidth: '80%',
              padding: '0.75rem 1rem',
              borderRadius: isMe ? '1rem 1rem 0.125rem 1rem' : '1rem 1rem 1rem 0.125rem',
              backgroundColor: isMe ? '#2563eb' : '#ffffff',
              color: isMe ? '#ffffff' : '#0f172a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: isMe ? 'none' : '1px solid #e2e8f0',
              fontSize: '0.8125rem',
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {b.text}
          </div>
        </div>
      );
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '1000px',
          maxWidth: '95vw',
          height: '700px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MessageSquare width={18} height={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#ffffff' }}>
                Query & Support Conversations
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {currentUser ? `Logged in as: ${currentUser}` : 'View and reply to procurement query tickets'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={fetchMessagesList}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '0.375rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Refresh messages"
            >
              <RefreshCw width={16} height={16} className={loading ? 'animate-spin' : ''} />
            </button>
            {onOpenRaiseQuery && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRaiseQuery();
                }}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + New Query
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '0.375rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X width={20} height={20} />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Column Master / Detail */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Left Sidebar - Query Threads List */}
          <div
            style={{
              width: '320px',
              borderRight: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Search Box */}
            <div style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  width={14}
                  height={14}
                  style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                />
                <input
                  type="text"
                  placeholder="Search queries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4375rem 0.625rem 0.4375rem 2rem',
                    fontSize: '0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Threads List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && threads.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <SpinnerLoaders size="small" text="Loading queries..." fullScreen={false} />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                  No queries found.
                </div>
              ) : (
                filteredThreads.map((t) => {
                  const isSelected = selectedThread?.message_id === t.message_id;
                  const toStr = Array.isArray(t.to) ? t.to.join(', ') : t.to;
                  return (
                    <div
                      key={t.message_id || t.id}
                      onClick={() => setSelectedThreadId(t.message_id)}
                      style={{
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                        borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#dbeafe', padding: '0.1rem 0.375rem', borderRadius: '0.25rem' }}>
                          #{t.message_id}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {t.created_on ? t.created_on.substring(0, 10) : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.title || 'Untitled Query'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                          To: {toStr || 'Support'}
                        </span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: t.status === 'OPEN' ? '#15803d' : '#64748b', backgroundColor: t.status === 'OPEN' ? '#dcfce7' : '#f1f5f9', padding: '0.05rem 0.35rem', borderRadius: '0.25rem' }}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Chat & Reply Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9' }}>
            {selectedThread ? (
              <>
                {/* Chat Thread Header */}
                <div style={{ padding: '0.875rem 1.25rem', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>
                        #{selectedThread.message_id}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                        {selectedThread.title}
                      </h4>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span><strong>From:</strong> {selectedThread.from}</span>
                      <span><strong>To:</strong> {Array.isArray(selectedThread.to) ? selectedThread.to.join(', ') : selectedThread.to}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      fontSize: '0.6875rem', 
                      fontWeight: 700, 
                      color: selectedThread.status?.toLowerCase().includes('close') ? '#b91c1c' : '#047857', 
                      backgroundColor: selectedThread.status?.toLowerCase().includes('close') ? '#fef2f2' : '#d1fae5', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '0.25rem', 
                      border: '1px solid',
                      borderColor: selectedThread.status?.toLowerCase().includes('close') ? '#fecaca' : '#a7f3d0' 
                    }}>
                      {selectedThread.status}
                    </span>
                    {!selectedThread.status?.toLowerCase().includes('CLOSE') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCloseTicket();
                        }}
                        disabled={sendingReply}
                        style={{
                          backgroundColor: 'transparent',
                          color: sendingReply ? '#94a3b8' : '#ef4444',
                          border: '1px solid',
                          borderColor: sendingReply ? '#cbd5e1' : '#fecaca',
                          borderRadius: '0.25rem',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          cursor: sendingReply ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.2s'
                        }}
                        title="End this conversation"
                      >
                        <span>End this conversation</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div style={{ flex: 1, padding: '1rem 1.25rem', overflowY: 'auto' }}>
                  {renderMessageBubbles(selectedThread)}
                </div>

                {/* Chat Reply Footer */}
                <form
                  onSubmit={handleSendReply}
                  style={{
                    padding: '0.875rem 1.25rem',
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    gap: '0.625rem',
                    alignItems: 'flex-end'
                  }}
                >
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to #${selectedThread.message_id}...`}
                    rows={2}
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.8125rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                  />

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      style={{
                        backgroundColor: sendingReply || !replyText.trim() ? '#94a3b8' : '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.625rem 1.125rem',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: sendingReply || !replyText.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        height: '42px',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <Send width={15} height={15} />
                      <span>{sendingReply ? 'Sending...' : 'Reply'}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <MessageSquare width={36} height={36} style={{ marginBottom: '0.5rem', color: '#cbd5e1' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Select a query thread to view details and reply</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            width: '320px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#0f172a' }}>Close Conversation</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
              Do you want to close this conversation?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={sendingReply}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: sendingReply ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCloseTicket}
                disabled={sendingReply}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  cursor: sendingReply ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                {sendingReply ? 'Closing...' : 'Yes, Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
