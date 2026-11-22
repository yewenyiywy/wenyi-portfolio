import Link from 'next/link'

export default function AfterglowPage() {
  return <main style={{position:'fixed',inset:0,background:'#211d22',display:'flex',flexDirection:'column'}}>
    <Link href="/" style={{padding:'12px 18px',color:'#fff4e0',fontSize:14}}>← Back to studio</Link>
    <iframe title="Afterglow" src="https://afterglow-gray-five.vercel.app/" allow="autoplay; fullscreen" style={{border:0,width:'100%',flex:1}}/>
  </main>
}
