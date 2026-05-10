import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY1;


const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_INSTRUCTION = `You are an expert agricultural AI specializing in Piquillo pepper greenhouse cultivation. 
Focus on: Fertilizer (NPK), Soil pH (6.0-6.8), Temperature (20-28°C), and Pests.
ONLY use plain text formatting. Use simple dashes (-) for lists. Do NOT use asterisks.`;

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_CONTENT_WIDTH = Math.min(SCREEN_WIDTH - 32, 680);

const cleanAIText = (text) => {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/^\s*\* /gm, '- ');
  cleaned = cleaned.replace(/(__)/g, '');
  cleaned = cleaned.replace(/\*/g, '');
  cleaned = cleaned.replace(/^#+\s/gm, '');
  return cleaned.trim();
};

export default function GreenhouseChatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Welcome! I'm your Piquillo Greenhouse Assistant. How can I help you grow premium peppers today?",
      sender: "ai",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);
  // ✅ NEW: track the streaming message id so we can update it in place
  const streamingIdRef = useRef(null);

  const [loaded] = useFonts({
    SpaceMono: require("../../../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const sendMessage = useCallback(async (textOverride = null) => {
    const textToSend = textOverride || input;
    if (textToSend.trim() === "" || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: textToSend.trim(),
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const chatHistory = [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      ...messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: userMessage.text }
    ];

    // ✅ NEW: create a placeholder AI message that we'll stream into
    const aiMsgId = Date.now() + 1;
    streamingIdRef.current = aiMsgId;
    const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(prev => [...prev, {
      id: aiMsgId,
      text: "",
      sender: "ai",
      time: aiTimestamp
    }]);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          stream: true,   // ✅ NEW: enable streaming
          messages: chatHistory
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `API Error: ${response.status}`);
      }

      // ✅ NEW: read the stream chunk by chunk
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Each chunk may contain multiple SSE lines
        const lines = chunk.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6)); // strip "data: "
            const token = json.choices?.[0]?.delta?.content;
            if (token) {
              accumulatedText += token;
              const cleaned = cleanAIText(accumulatedText);

              // ✅ Update the placeholder message in place
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMsgId
                    ? { ...msg, text: cleaned }
                    : msg
                )
              );
            }
          } catch {
            // ignore malformed JSON lines
          }
        }
      }

      // Fallback if nothing came through
      if (!accumulatedText.trim()) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMsgId
              ? { ...msg, text: "I'm having trouble thinking of a response right now." }
              : msg
          )
        );
      }

    } catch (error) {
      console.error("Groq API Error:", error.message);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMsgId
            ? { ...msg, text: `Error: ${error.message}` }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      streamingIdRef.current = null;
    }
  }, [input, isLoading, messages]);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  if (!loaded) return null;

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={styles.messageRowOuter}>
        <View style={styles.messageRowInner}>
          <View style={[
            styles.messageRow,
            isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
          ]}>
            {!isUser && (
              <View style={styles.aiAvatarContainer}>
                <View style={styles.aiAvatar}>
                  <MaterialCommunityIcons name="leaf" size={16} color="white" />
                </View>
              </View>
            )}
            <View style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.aiBubble,
              isUser
                ? { maxWidth: MAX_CONTENT_WIDTH * 0.65 }
                : { maxWidth: MAX_CONTENT_WIDTH * 0.85 }
            ]}>
              <Text style={isUser ? styles.userText : styles.aiText}>{item.text}</Text>
              <Text style={[styles.timeText, isUser ? { color: '#CBD5E1' } : { color: '#94A3B8' }]}>
                {item.time}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : null}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatArea}
          ListHeaderComponent={() => (
            <View style={styles.messageRowOuter}>
              <View style={styles.messageRowInner}>
                <View style={styles.welcomeSection}>
                  <View style={styles.heroCircle}>
                    <MaterialCommunityIcons name="sprout" size={38} color="#10B981" />
                  </View>
                  <Text style={styles.welcomeTitle}>Piquillo Pepper Expert</Text>
                  <Text style={styles.welcomeSub}>Specialized Greenhouse Management System</Text>
                </View>
              </View>
            </View>
          )}
        />

        {isLoading && (
          <View style={styles.messageRowOuter}>
            <View style={styles.messageRowInner}>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#1E293B" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.footerContainer}>
          <View style={styles.inputShadowBox}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask a question..."
              placeholderTextColor="#94A3B8"
              multiline={false}
              // ✅ NEW: Enter key sends the message
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              style={[styles.sendAction, (isLoading || !input.trim()) && styles.sendActionDisabled]}
              onPress={() => sendMessage()}
              disabled={isLoading || !input.trim()}
            >
              <Ionicons name="arrow-up" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const COLORS = {
  primary: '#1E293B',
  background: '#FFFFFF',
  textMain: '#1E293B',
  textSecondary: '#64748B',
  aiBubble: '#F1F5F9',
  userBubble: '#1E293B',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Full screen width, centers the inner column
  messageRowOuter: {
    width: '100%',
    alignItems: 'center',        // <-- this centers messageRowInner
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  // The centered column — same width as input bar
  messageRowInner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH, // <-- caps width, stays centered
  },

  chatArea: {
    paddingTop: 60,
    paddingBottom: 40,
  },

  welcomeSection: {
    alignItems: 'center',
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  heroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.textMain,
  },
  welcomeSub: {
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 8,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  aiAvatarContainer: {
    marginRight: 10,
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  messageBubble: {
    padding: 16,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: COLORS.aiBubble,
    borderBottomLeftRadius: 2,
  },
  userText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  aiText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
  },
  timeText: {
    fontSize: 10,
    marginTop: 8,
    alignSelf: 'flex-end',
  },

  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 12,
    marginBottom: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  footerContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  inputShadowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.textMain,
    height: 40,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
    outlineWidth: 0,
    selectionColor: '#10B981',
  },
  sendAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendActionDisabled: {
    backgroundColor: '#CBD5E1',
  },
});