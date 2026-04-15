const chat = document.getElementById("chat");
const input = document.getElementById("input");
const imgInput = document.getElementById("imgInput");
const preview = document.getElementById("preview");
const main = document.querySelector(".main");
let images = [];

/* ENTER SEND */
input.addEventListener("keydown", e=>{
  if(e.key==="Enter" && !e.shiftKey){
    e.preventDefault();
    send();
  }
});

/* AUTO HEIGHT */
input.addEventListener("input", ()=>{
  input.style.height="auto";
  input.style.height=input.scrollHeight+"px";
});

/* IMAGE PREVIEW */
imgInput.addEventListener("change", e=>{
  images=[];
  preview.innerHTML="";

  [...e.target.files].forEach(file=>{
    const reader=new FileReader();

  reader.onload=()=>{
  const src = reader.result;
  images.push(src);

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";

  const img = document.createElement("img");
  img.src = src;

  // nút X
  const btn = document.createElement("span");
  btn.innerText = "×";

  // style nhanh luôn (không cần sửa CSS)
  btn.style.position = "absolute";
  btn.style.top = "-5px";
  btn.style.right = "-5px";
  btn.style.background = "#000";
  btn.style.color = "#fff";
  btn.style.width = "16px";
  btn.style.height = "16px";
  btn.style.borderRadius = "50%";
  btn.style.fontSize = "12px";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.cursor = "pointer";

  // click xoá
  btn.onclick = () => {
    wrapper.remove();
    images = images.filter(i => i !== src);

    if(images.length === 0){
      imgInput.value = "";
    }
  };

  wrapper.appendChild(img);
  wrapper.appendChild(btn);
  preview.appendChild(wrapper);
};

    reader.readAsDataURL(file);
  });
});

/* SEND */
document.getElementById("sendBtn").onclick=send;

async function send(){
  const text=input.value.trim();
  if(!text && !images.length) return;

  add("user",text,images);

  input.value="";
  preview.innerHTML="";
  images=[];

  const bot=add("bot","...");

  try{
    const res=await fetch("/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:text})
    });

    const data=await res.json();
    bot.innerText=data.reply;

  }catch{
    bot.innerText="Lỗi server";
  }
}

/* ADD MESSAGE */
function add(role,text,imgs=[]){
  const wrap = document.createElement("div");
  wrap.className = "msg " + role;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if(text){
    const t=document.createElement("div");
    t.innerText=text;
    bubble.appendChild(t);
  }

  imgs.forEach(src=>{
    const img=document.createElement("img");
    img.src=src;
    bubble.appendChild(img);
  });

  wrap.appendChild(bubble);
  chat.appendChild(wrap);
    // 👇 AUTO SCROLL ĐÚNG
  setTimeout(() => {
    main.scrollTo({
      top: main.scrollHeight + 500,
      behavior: "smooth"
    });
  }, 0);

  

  return bubble;
  
}

/* NEW CHAT */
function newChat(){
  chat.innerHTML="";
}

/* DARK LIGHT */
function toggleTheme(){
  document.body.classList.toggle("light");
}

/* VOICE */
function startVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return alert("Không hỗ trợ mic");

  const r = new SR();

  r.lang = "vi-VN";
  r.continuous = true;        // 👈 QUAN TRỌNG: nghe liên tục
  r.interimResults = true;    // 👈 nhận kết quả tạm

  let finalText = "";

  r.onresult = (e) => {
    let interim = "";

    for(let i = e.resultIndex; i < e.results.length; i++){
      const transcript = e.results[i][0].transcript;

      if(e.results[i].isFinal){
        finalText += transcript + " ";
      }else{
        interim += transcript;
      }
    }

    input.value = finalText + interim;
  };

  r.onerror = (e) => {
    console.log("Lỗi mic:", e.error);
  };

  r.onend = () => {
    console.log("Mic stopped");
  };

  r.start();
}

window.scrollTo({
  top: document.body.scrollHeight,
  behavior: "smooth"
});

