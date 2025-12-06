import { useState } from "react"
import api from "../api/client"

const ChatPanel = ({open,onClose}) =>{
  const [msg,setMsg]=useState("")
  const [messages,setMessages]=useState([])

  const send=async()=>{
      const res = await api.post("/ai/chat",{message:msg,userId:"test"})
      setMessages([...messages,{role:"user",text:msg},{role:"ai",text:res.data.answer}])
      setMsg("")
  }

  if(!open) return null

  return(
    <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 w-full h-[calc(100vh-4rem)] sm:w-80 sm:h-96 max-h-[600px] sm:max-h-none
                    bg-[#333333] border border-[#555555] sm:rounded-lg shadow-xl 
                    flex flex-col">
        <header className="p-3 border-b border-[#555555] flex justify-between bg-[#1A1A1A] sm:rounded-t-2xl">
          <span className="font-semibold text-white text-sm sm:text-base">AI Ассистент</span>
          <button onClick={onClose} className="text-white/60 hover:text-white text-lg sm:text-sm transition-colors w-6 h-6 sm:w-auto sm:h-auto flex items-center justify-center">✕</button>
        </header>

        <div className="flex-1 p-2 sm:p-3 overflow-y-auto space-y-2 bg-[#333333] custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center text-white/50 text-sm mt-4">Начните диалог с AI-ассистентом</div>
          )}
          {messages.map((m,i)=>(
            <div key={i} className={`p-2 sm:p-3 rounded-lg max-w-[90%] sm:max-w-[85%] text-xs sm:text-sm break-words ${
              m.role==="user"?"ml-auto bg-[#FFDD2D] text-[#333333]":"bg-[#1A1A1A] text-white"
            }`}>
              {m.text}
            </div>
          ))}
        </div>

        <div className="p-2 sm:p-3 border-t border-[#555555] flex gap-2 bg-[#1A1A1A] sm:rounded-b-2xl">
          <input 
            className="flex-1 bg-[#333333] border border-[#555555] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]"
            value={msg} 
            onChange={e=>setMsg(e.target.value)}
            placeholder="Введите сообщение..."
            onKeyPress={(e) => e.key === 'Enter' && send()}
          />
          <button onClick={send} className="bg-[#FFDD2D] text-[#333333] px-3 sm:px-4 rounded-lg font-semibold hover:bg-[#FFE855] transition-colors text-sm sm:text-base flex items-center justify-center min-w-[44px]">↗</button>
        </div>
    </div>
  )
}

export default ChatPanel
