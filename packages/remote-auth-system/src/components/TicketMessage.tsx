import React, { useState, useRef, useEffect } from 'react';
import {
  getTicketMessages,
  createTicketMessage,
  uploadTicketImage,
} from '../api/messageApi';
import type { MessageDto } from '../Dto/MessageDto';
import { Send } from 'lucide-react';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import type { TicketDto } from '../Dto/TicketDto';
import './TicketMessage.css';
import {
  startTicketMessageHub,
  stopTicketMessageHub,
  getConnectionStatus
} from '../signalr/ticketMessageHub';
import { useAuth } from './context/AuthContext';
import { ASSET_TYPES, ENTITY_TYPE, USER_DISPLAY_TEXT } from '../common/common';
import { assetGetById } from '../api/assetApi';
import type { AssetUploadDto } from '../Dto/AssetUploadDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import { useNavigate } from 'react-router-dom';
import ErrorModel from './ErrorModel';

interface TicketMessageProps {
  ticket?: TicketDto | null;
}

// Example local file URLs (developer-provided) — environment will transform these into accessible URLs.
const EXAMPLE_FILE_URLS = [
  '/mnt/data/53e1613b-bc3e-4d0f-8b65-cb151b3c8292.png',
  '/mnt/data/7e7df98e-8bc6-4a3c-8529-baf0e3d70544.png',
];

const TicketMessage: React.FC<TicketMessageProps> = ({ ticket }) => {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [imageDataUrls, setImageDataUrls] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalMessagesLoaded, setTotalMessagesLoaded] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [showTyping, setShowTyping] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Modal state now supports multiple images and an index
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);

  const navigate = useNavigate();
  const [errorPageData, setErrorPageData] = useState({
    title: '',
    message: ''
  });

  const limit = 20;
  const auth = useAuth();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  function isErrorResponse(response: SuccessResponseDto | ErrorResponseDto): response is ErrorResponseDto {
    return 'message' in response && 'statusCode' in response;
  }

  const handleSessionConfirm = () => {
    setShowSessionModal(false);
    navigate('/');
  };

  useEffect(() => {
    let isMounted = true;

    const initializeTicket = async () => {
      if (!ticket?.id) return;

      try {
        if (isMounted) {
          setMessages([]);
          setImageDataUrls({});
          setHasMore(true);
          setIsLoadingMore(false);
          setTotalMessagesLoaded(0);
          setIndex(0);

          await fetchMessages(0, true);
          await startSignalR();
        }
      } catch (error) {
      }
    };

    initializeTicket();

    return () => {
      isMounted = false;
      stopTicketMessageHub();
      setConnectionStatus('disconnected');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.id]);

  const startSignalR = async () => {
    if (!ticket?.id) return;

    try {
      await startTicketMessageHub(ticket.id, (newMessages) => {
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.userId !== auth.auth?.userId) {
          setShowTyping(true);
          setTimeout(() => {
            setShowTyping(false);
            setMessages(prev => {
              const existingMessageIds = new Set(prev.map(m => m.messageId || JSON.stringify((m as any).assetIds) || m.assetId));
              const filteredNewMessages = newMessages.filter(msg => {
                const id = msg.messageId || JSON.stringify((msg as any).assetIds) || msg.assetId;
                return !existingMessageIds.has(id);
              });
              return [...prev, ...filteredNewMessages];
            });
          }, 1000);
        } else {
          setMessages(prev => {
            const existingMessageIds = new Set(prev.map(m => m.messageId || JSON.stringify((m as any).assetIds) || m.assetId));
            const filteredNewMessages = newMessages.filter(msg => {
              const id = msg.messageId || JSON.stringify((msg as any).assetIds) || msg.assetId;
              return !existingMessageIds.has(id);
            });
            return [...prev, ...filteredNewMessages];
          });
        }
      });

      const { isConnected } = getConnectionStatus();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');

    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    if (index === 0 && !isLoadingMore && !loading) {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
    }
  }, [messages, loading, isLoadingMore, index]);

  const fetchMessages = async (offset: number, reset = false) => {
    if (!ticket?.id || loading || (!hasMore && !reset)) return;

    if (reset) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const result = await getTicketMessages(ticket.id, offset, limit);
      if (Array.isArray(result)) {
        const sorted = result.sort(
          (a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
        );

        if (sorted.length < limit) setHasMore(false);
        if (sorted.length === 0 && !reset) return;

        if (reset) {
          setMessages(sorted);
          setTotalMessagesLoaded(sorted.length);
        } else {
          setMessages(prev => [...sorted, ...prev]);
          setTotalMessagesLoaded(prev => prev + sorted.length);
        }

      } else if ('statusCode' in result && result.statusCode === 401) {
        setShowSessionModal(true);
        setErrorPageData({
          title: result.message,
          message: result.description,
        });
      }
      else {
        const errorResult = result as ErrorResponseDto;
        setError(errorResult.message || 'Failed to fetch messages');
        setMessages([]);
        setHasMore(false);
        setTotalMessagesLoaded(0);
      }
    } catch (error) {
      setError('An unexpected error occurred while fetching messages');
      setMessages([]);
      setHasMore(false);
      setTotalMessagesLoaded(0);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Fetch images for all asset IDs found in messages (supports assetId or assetIds)
  useEffect(() => {
    const fetchImages = async () => {
      // collect all asset ids that are not yet in imageDataUrls
      const assetIdsToFetch = new Set<string>();
      messages.forEach(m => {
        const asAny = m as any;
        if (Array.isArray(asAny.assetIds)) {
          asAny.assetIds.forEach((id: string) => {
            if (!imageDataUrls[id]) assetIdsToFetch.add(id);
          });
        } else if (m.assetId && !imageDataUrls[m.assetId]) {
          assetIdsToFetch.add(m.assetId);
        }
      });

      if (assetIdsToFetch.size === 0) return;

      const newDataUrls: Record<string, string> = {};
      for (const aid of Array.from(assetIdsToFetch)) {
        try {
          const result = await assetGetById(aid);
          if ('fileBytes' in result && 'contentType' in result) {
            newDataUrls[aid] = `data:${result.contentType};base64,${result.fileBytes}`;
          }
          else if ('statusCode' in result && result.statusCode === 401) {
            setShowSessionModal(true);
            setErrorPageData({
              title: (result as any).message,
              message: (result as any).description,
            });
          } else {
            newDataUrls[aid] = 'FAILED';
          }
        } catch {
          newDataUrls[aid] = 'FAILED';
        }
      }

      if (Object.keys(newDataUrls).length > 0) {
        setImageDataUrls(prev => ({ ...prev, ...newDataUrls }));
      }
    };

    fetchImages();
  }, [messages, imageDataUrls]);

  useEffect(() => {
    return () => {
      Object.values(imageDataUrls).forEach(url => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [imageDataUrls]);

  const handleSendMessage = async () => {
    if (!ticket?.id || !newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);
    setError(null);

    try {
      const result = await createTicketMessage({ ticketId: ticket.id, message: messageText });
      if ('statusCode' in result && result.statusCode >= 400) {
        setError(result.message || 'Failed to send message');
        setNewMessage(messageText);
      }
      else if (isErrorResponse(result) && result.statusCode === 401) {
        setShowSessionModal(true);
        setErrorPageData({
          ...errorPageData,
          title: result.message,
          message: result.description
        });
      }
    } catch {
      setError('An unexpected error occurred while sending the message');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // NEW: handle multiple file uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ticket?.id || !e.target.files?.length || uploading) return;

    const files = Array.from(e.target.files);
    const maxPerFile = 5 * 1024 * 1024; // 5MB per file

    // validate first
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > maxPerFile) {
        setError('Each file must be less than 5MB');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setUploading(true);
    setError(null);

    const uploadedAssetIds: string[] = [];

    try {
      // upload sequentially (keeps it simple and avoids flooding backend)
      for (const file of files) {
        // read file as base64
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const part = result.split(',')[1];
            resolve(part);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const payload: AssetUploadDto = {
          entityType: ENTITY_TYPE.TICKET,
          entityId: ticket.id,
          assetType: ASSET_TYPES.ADDITIONAL_UPLOADED_FILE,
          fileBytes: base64String,
          fileName: file.name,
          contentType: file.type,
          isSingletonAsset: false,
        };

        try {
          const result = await uploadTicketImage(payload);
          // handle different possible result shapes:
          if (result && typeof result === 'object') {
            if ((result as any).assetId) {
              uploadedAssetIds.push((result as any).assetId);
            } else if ((result as any).id) {
              uploadedAssetIds.push((result as any).id);
            } else if (Array.isArray((result as any).assetIds)) {
              uploadedAssetIds.push(...(result as any).assetIds);
            } else if (Array.isArray(result)) {
              uploadedAssetIds.push(...(result as any));
            } else {
              // unknown success shape: server likely attached asset to ticket and SignalR will notify
            }
          }
        } catch (err) {
          // if one file fails, continue uploading others but note the error
        }
      }

      // after upload(s) finished, refresh messages so server-side attached assets show up.
      await fetchMessages(0, true);

      // optionally prefetch the new uploaded asset bytes so UI shows them sooner:
      if (uploadedAssetIds.length > 0) {
        const newDataUrls: Record<string, string> = {};
        for (const aid of uploadedAssetIds) {
          try {
            const res = await assetGetById(aid);
            if ('fileBytes' in res && 'contentType' in res) {
              newDataUrls[aid] = `data:${res.contentType};base64,${res.fileBytes}`;
            }
          } catch {
            // ignore
          }
        }
        if (Object.keys(newDataUrls).length > 0) {
          setImageDataUrls(prev => ({ ...prev, ...newDataUrls }));
        }
      }
    } catch (err) {
      setError('An unexpected error occurred while uploading images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScroll = () => {
    if (
      !messageListRef.current ||
      isLoadingMore ||
      !hasMore ||
      loading
    ) {
      return;
    }

    const { scrollTop } = messageListRef.current;

    if (scrollTop <= 50 && totalMessagesLoaded >= limit) {
      const nextIndex = index + limit;
      setIsLoadingMore(true);
      setIndex(nextIndex);
      fetchMessages(nextIndex);
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'numeric', year: 'numeric' });

  const getRelativeDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (messageDateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday';
    } else {
      return formatDate(date);
    }
  };

  const getAvatarColor = (name: string) => {
    if (!name) return 'blue';
    return ['green', 'purple', 'orange', 'blue', 'red', 'teal'][
      Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 6
    ];
  };

  const getAvatarInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUniqueKey = (message: MessageDto) =>
    message.messageId || JSON.stringify((message as any).assetIds) || message.assetId || `${message.type}-${message.dateCreated}-${message.userId}`;

  const getMessageAssetIds = (message: MessageDto) => {
    const asAny = message as any;
    if (Array.isArray(asAny.assetIds) && asAny.assetIds.length > 0) return asAny.assetIds as string[];
    if (message.assetId) return [message.assetId];
    return [];
  };

  const groupMessagesByDate = (messages: MessageDto[]) => {
    const groups: { date: string; messages: MessageDto[] }[] = [];
    messages.forEach(message => {
      const date = new Date(message.dateCreated).toDateString();
      const existingGroup = groups.find(g => g.date === date);
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }
    });
    return groups;
  };

  // keyboard controls for modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalImages.length > 0) {
        if (e.key === 'Escape') {
          setModalImages([]);
          setModalIndex(0);
        } else if (e.key === 'ArrowRight') {
          setModalIndex(i => Math.min(i + 1, modalImages.length - 1));
        } else if (e.key === 'ArrowLeft') {
          setModalIndex(i => Math.max(i - 1, 0));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalImages]);

  const openImageModalForMessage = (message: MessageDto, startIndex = 0) => {
    const ids = getMessageAssetIds(message);
    const dataUrls: string[] = ids.map(id => imageDataUrls[id]).filter(Boolean) as string[];

    // if none available (e.g. FAILED), fallback to example file urls
    if (dataUrls.length === 0) {
      // create replicated fallback list with same length as ids, or at least one
      const fallback = EXAMPLE_FILE_URLS.length ? EXAMPLE_FILE_URLS : [];
      const filled = ids.length > 0 ? ids.map((_, i) => fallback[i % fallback.length] || '') : fallback;
      setModalImages(filled.filter(Boolean));
      setModalIndex(0);
    } else {
      setModalImages(dataUrls);
      setModalIndex(Math.min(startIndex, dataUrls.length - 1));
    }
  };

  const closeModal = () => {
    setModalImages([]);
    setModalIndex(0);
  };

  const prevModal = () => {
    setModalIndex(i => Math.max(i - 1, 0));
  };
  const nextModal = () => {
    setModalIndex(i => Math.min(i + 1, modalImages.length - 1));
  };

  if (!ticket) {
    return (
      <div className="ticket-conversation-wrapper">
        <div className="conversation-empty">
          <p>Select a ticket to view the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-conversation-wrapper">
      <header className="conversation-header">
        <h3 className="conversation-title">Conversation</h3>
        <div className="message-chat-status">
          <span
            className="signalr-status-dot"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'connected' ? 'green' : 'red',
              display: 'flex'
            }}
          />
          <span
            style={{
              fontSize: 14,
              color: connectionStatus === 'connected' ? 'green' : 'red',
            }}
          >
            {connectionStatus === 'connected' ? 'Online' : 'Offline'}
          </span>
        </div>
        {(loading || isLoadingMore) && <span className="loading-indicator">Loading...</span>}
      </header>

      <div
        className="conversation-body hide-scrollbar"
        onScroll={handleScroll}
        ref={messageListRef}
      >
        <div className="conversation-date-badge">
          {formatDate(ticket.dateCreated)}
        </div>

        {isLoadingMore && (
          <div className="loading-more-indicator" style={{ textAlign: 'center', padding: '10px' }}>
            Loading older messages...
          </div>
        )}

        <div className="messages-list">
          {messages.length === 0 && !loading ? (
            <div className="no-messages">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            groupMessagesByDate(messages).map(group => (
              <div key={group.date}>
                <div className="conversation-date-badge">
                  {getRelativeDate(group.date)}
                </div>
                {group.messages.map(message => (
                  <div key={getUniqueKey(message)} className="message-item">
                    <div className={`message-avatar message-avatar--${getAvatarColor(message.userName)}`}>
                      {getAvatarInitials(message.userName)}
                    </div>
                    <div className="message-content">
                      <div className="message-meta">
                        <span className="message-author">
                          {message.userId === auth.auth?.userId ? USER_DISPLAY_TEXT.YOU : message.userName}
                        </span>
                        <span className="message-timestamp">{formatTime(message.dateCreated)}</span>
                      </div>
                      {message.message && <div className="message-text">{message.message}</div>}

                      {/* Render multiple images for a message */}
                      {getMessageAssetIds(message).length > 0 && (
                        <div className="message-asset-grid">
                          {getMessageAssetIds(message).map((aid, idx) => {
                            const src = imageDataUrls[aid];
                            if (!src || src === 'FAILED') return null;
                            return (
                              <img
                                key={aid || idx}
                                src={src}
                                alt={message.message || `Image ${idx + 1}`}
                                className="message-image"
                                style={{ maxWidth: '200px', height: 'auto', borderRadius: 6, cursor: 'pointer', marginRight: 8, marginBottom: 8 }}
                                onClick={() => openImageModalForMessage(message, idx)}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}

          {showTyping && (
            <div className="message-item">
              <div className="message-avatar message-avatar--gray">...</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="messages-end-marker" />
        </div>
      </div>

      <footer className="conversation-footer">
        <div className="message-input-container">
          <div className="input-wrapper-box">
            <label className={`attachment-button ${uploading ? 'uploading' : ''}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="attachment-input"
                disabled={uploading || !ticket?.id}
              />
              {uploading ? '...' : '+'}
            </label>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="text-input"
              disabled={sending || !ticket?.id}
            />
            <button
              onClick={handleSendMessage}
              className="send-button"
              type="button"
              disabled={sending || !newMessage.trim() || !ticket?.id}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </footer>

      {/* Multi-image modal */}
      {modalImages.length > 0 && (
        <div className="image-modal" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="image-modal-inner" onClick={e => e.stopPropagation()}>
            <div className="image-modal-header">
              <button className="image-modal-close" onClick={closeModal}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={prevModal} disabled={modalIndex === 0} className="modal-nav-btn">‹</button>
              <img src={modalImages[modalIndex]} alt={`View ${modalIndex + 1}`} className="image-modal-content" />
              <button onClick={nextModal} disabled={modalIndex === modalImages.length - 1} className="modal-nav-btn">›</button>
            </div>

            <div className="image-modal-actions">
              <a href={modalImages[modalIndex]} target="_blank" rel="noreferrer" className="image-modal-open-link">Open in new tab</a>
            </div>
          </div>
        </div>
      )}

      {showSessionModal && <ErrorModel
        visible={showSessionModal}
        title=''
        message={errorPageData.title}
        onConfirm={handleSessionConfirm}
        onClose={handleSessionConfirm}
      />}
    </div>
  );
};

export default TicketMessage;
