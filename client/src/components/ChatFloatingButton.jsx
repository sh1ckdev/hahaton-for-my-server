const ChatFloatingButton = ({onClick}) => (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-[#FFDD2D] text-[#333333] 
                 rounded-full w-14 h-14 flex items-center justify-center 
                 shadow-xl hover:scale-105 hover:bg-[#FFE855] transition-all">
        💬
    </button>
  )
  export default ChatFloatingButton
  