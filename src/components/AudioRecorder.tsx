
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onSendAudio: (audioBlob: Blob) => void;
  onCancel: () => void;
  disabled?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onSendAudio,
  onCancel,
  disabled = false,
  onRecordingStateChange
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer de gravação
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      console.log('🎤 Iniciando gravação de áudio...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      streamRef.current = stream;
      
      // Preferir OGG primeiro, depois WebM como fallback
      let mimeType = 'audio/ogg;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
          }
        }
      }
      
      console.log('🎤 Tipo de mídia selecionado:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (event) => {
        console.log('📡 Dados de áudio recebidos:', event.data.size, 'bytes');
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 Gravação finalizada. Chunks coletados:', audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          console.error('❌ Nenhum chunk de áudio foi coletado');
          onCancel();
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('✅ Blob de áudio criado:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length
        });

        if (audioBlob.size < 500) {
          console.error('❌ Áudio muito pequeno, provavelmente inválido');
          onCancel();
          return;
        }

        // Enviar áudio imediatamente após criação do blob
        console.log('📤 Enviando áudio para processamento...');
        onSendAudio(audioBlob);
        resetRecorder();
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ Erro no MediaRecorder:', event);
        onCancel();
      };

      // Começar gravação com intervalos menores para capturar mais dados
      mediaRecorder.start(250);
      setIsRecording(true);
      onRecordingStateChange?.(true);
      
      console.log('🎤 Gravação iniciada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao acessar microfone:', error);
      onCancel();
    }
  };

  const stopRecording = () => {
    console.log('🛑 Parando gravação...');
    
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      onRecordingStateChange?.(false);
      
      // Parar stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('🔇 Track de áudio parado:', track.label);
        });
        streamRef.current = null;
      }
    }
  };

  const resetRecorder = () => {
    setIsRecording(false);
    setRecordingTime(0);
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    onRecordingStateChange?.(false);
  };

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Durante a gravação: botão de enviar
  if (isRecording) {
    return (
      <Button 
        onClick={stopRecording}
        size="icon"
        variant="default"
        disabled={disabled}
        className="bg-primary hover:bg-primary/90 transition-colors animate-pulse"
        title={`Enviar áudio gravado (${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')})`}
      >
        <Send className="w-4 h-4" />
      </Button>
    );
  }

  // Estado padrão: botão de microfone
  return (
    <Button 
      onClick={startRecording}
      size="icon"
      variant="outline"
      disabled={disabled}
      className="hover:bg-primary hover:text-primary-foreground transition-colors"
      title="Gravar mensagem de áudio"
    >
      <Mic className="w-4 h-4" />
    </Button>
  );
};
