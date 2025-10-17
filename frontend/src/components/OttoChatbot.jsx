import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  SmartToy as BotIcon,
  Send as SendIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';

const WEBHOOK_URL = 'http://localhost:5678/webhook/otto-rag';

const exampleQuestions = [
  'What services does Nucleus ML offer?',
  'Do you operate in the Democratic Republic of Congo?',
  'Can you handle abnormal loads and hazardous materials?',
  'What is the DRC border pre-alert system?',
  'How do I contact Nucleus ML?',
];

export default function OttoChatbot({ open, onClose }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  useEffect(() => {
    // Clear timer on unmount
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setElapsedTime(0);

    const startTime = performance.now();

    // Start timer
    const interval = setInterval(() => {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      setElapsedTime(elapsed);
    }, 100);
    setTimerInterval(interval);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      clearInterval(interval);
      const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.status === 'success' || data.answer) {
        setResponse({
          answer: data.answer,
          totalTime,
          model: data.model,
          contextUsed: data.context_used,
          sources: data.sources,
        });
      } else if (data.status === 'error') {
        throw new Error(data.response || 'An error occurred');
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      clearInterval(interval);
      console.error('Chatbot error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillQuestion = (q) => {
    setQuestion(q);
  };

  const handleClose = () => {
    setQuestion('');
    setResponse(null);
    setError(null);
    setLoading(false);
    if (timerInterval) clearInterval(timerInterval);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #001f3f 0%, #003d5c 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 50,
              height: 50,
              background: '#73e9c7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            🤖
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              OTTO AI Assistant
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Ask me anything about logistics
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#333' }}>
              Your Question:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What services does Nucleus ML offer in the DRC?"
              variant="outlined"
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  borderRadius: '10px',
                  '&:hover fieldset': {
                    borderColor: '#73e9c7',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#73e9c7',
                  },
                },
              }}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || !question.trim()}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            sx={{
              py: 1.5,
              background: '#001f3f',
              color: 'white',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '16px',
              '&:hover': {
                background: '#003d5c',
                transform: 'translateY(-2px)',
                boxShadow: '0 10px 20px rgba(0, 31, 63, 0.4)',
              },
              transition: 'all 0.2s',
            }}
          >
            {loading ? `Thinking... (${elapsedTime}s)` : 'Ask OTTO'}
          </Button>
        </form>

        {/* Loading State */}
        {loading && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 3,
              borderRadius: '10px',
              borderLeft: '4px solid #73e9c7',
              textAlign: 'center',
              bgcolor: 'white',
            }}
          >
            <CircularProgress size={40} sx={{ color: '#73e9c7' }} />
            <Typography sx={{ mt: 2, color: '#001f3f' }}>OTTO is thinking...</Typography>
            <Typography sx={{ mt: 1, color: '#73e9c7', fontWeight: 600 }}>
              {elapsedTime}s
            </Typography>
          </Paper>
        )}

        {/* Response */}
        {response && !loading && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 3,
              borderRadius: '10px',
              borderLeft: '4px solid #73e9c7',
              bgcolor: 'white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background: '#73e9c7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <LightbulbIcon sx={{ color: '#001f3f' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#001f3f' }}>
                OTTO's Response
              </Typography>
            </Box>

            <Typography
              sx={{
                color: '#555',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                mb: 2,
              }}
            >
              {response.answer}
            </Typography>

            {/* Timing Info */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: '#e6f9f5',
                borderRadius: '8px',
                border: '1px solid #73e9c7',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label={`Response Time: ${response.totalTime}s`}
                  size="small"
                  sx={{ bgcolor: 'white', fontWeight: 600, color: '#001f3f' }}
                />
                {response.model && (
                  <Chip
                    label={`Model: ${response.model}`}
                    size="small"
                    sx={{ bgcolor: 'white', color: '#001f3f' }}
                  />
                )}
                {response.contextUsed && (
                  <Chip
                    label={`Context: ${response.contextUsed} chunks`}
                    size="small"
                    sx={{ bgcolor: 'white', color: '#001f3f' }}
                  />
                )}
              </Box>
              {response.sources && response.sources.length > 0 && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#001f3f' }}>
                  <strong>Sources:</strong> {[...new Set(response.sources)].join(', ')}
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {/* Error */}
        {error && !loading && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 3,
              borderRadius: '10px',
              borderLeft: '4px solid #e74c3c',
              bgcolor: '#fee',
            }}
          >
            <Typography sx={{ color: '#c0392b', whiteSpace: 'pre-wrap' }}>
              ❌ Error: {error}
              {'\n\n'}Please check:
              {'\n'}1. Is the workflow active in n8n?
              {'\n'}2. Is the webhook URL correct?
              {'\n'}3. Do you have internet connection?
            </Typography>
          </Paper>
        )}

        {/* Example Questions */}
        <Box sx={{ mt: 3, p: 3, bgcolor: '#e6f9f5', borderRadius: '10px', border: '1px solid #73e9c7' }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#001f3f' }}>
            💭 Example Questions:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {exampleQuestions.map((q, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#001f3f',
                  fontSize: '14px',
                  border: '1px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: '#f0fdfb',
                    borderColor: '#73e9c7',
                    transform: 'translateX(4px)',
                  },
                }}
                onClick={() => fillQuestion(q)}
              >
                {q}
              </Paper>
            ))}
          </Box>
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 3,
            color: '#999',
          }}
        >
          Powered by OTTO • Nucleus ML AI Assistant
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
