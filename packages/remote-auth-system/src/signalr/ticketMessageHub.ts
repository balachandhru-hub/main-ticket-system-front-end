import * as signalR from "@microsoft/signalr";
import type { MessageDto } from "../Dto/MessageDto";

let connection: signalR.HubConnection | null = null;
let currentTicketId: string | null = null;
let isConnecting: boolean = false;
let connectionPromise: Promise<void> | null = null;

export const startTicketMessageHub = async (
  ticketId: string,
  onReceiveMessages: (messages: MessageDto[]) => void
) => {
  if (isConnecting && currentTicketId === ticketId && connectionPromise) {
    await connectionPromise;
    return;
  }

  if (connection && currentTicketId === ticketId && connection.state === signalR.HubConnectionState.Connected) {
    return;
  }

  if (connection && currentTicketId !== ticketId) {
    await stopTicketMessageHub();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  isConnecting = true;
  currentTicketId = ticketId;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL; 
  const hubUrl = `${apiBaseUrl}/ticket-message-hub?ticketId=${ticketId}`; 

  try {
    connection = new signalR.HubConnectionBuilder()
      .configureLogging(signalR.LogLevel.Information)
      .withUrl(hubUrl, {
        withCredentials: true, 
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
        skipNegotiation: false,
        timeout: 30000,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    connection.off("ReceiveMessage");
    
    connection.on("ReceiveMessage", (newMessages: MessageDto[]) => {
      onReceiveMessages(newMessages);
    });

    connection.onreconnecting(() => {
    });

    connection.onreconnected(() => {
    });

    connection.onclose(() => {
      if (currentTicketId === ticketId) {
        connection = null;
        currentTicketId = null;
      }
      isConnecting = false;
    });

    connectionPromise = connection.start();
    await connectionPromise;
    isConnecting = false;
    connectionPromise = null;
    
  } catch (err) {
    connection = null;
    currentTicketId = null;
    isConnecting = false;
    connectionPromise = null;
    throw err;
  }
};

export const stopTicketMessageHub = async () => {
  if (connection) {
    try {
      connection.off("ReceiveMessage");
      
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        await connection.stop();
      }
      
    } catch (err) {
    } finally {
      connection = null;
      currentTicketId = null;
      isConnecting = false;
      connectionPromise = null;
    }
  }
};

export const getConnectionStatus = () => {
  return {
    isConnected: connection?.state === signalR.HubConnectionState.Connected,
    currentTicketId,
    connectionState: connection?.state
  };
};

export const forceDisconnect = async () => {
  if (connection) {
    connection.off("ReceiveMessage");
    await stopTicketMessageHub();
  }
};