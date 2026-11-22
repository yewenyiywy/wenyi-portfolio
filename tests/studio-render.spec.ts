import {test,expect,type Page} from '@playwright/test'

async function luminance(page:Page,shot:Buffer){
  return page.evaluate(async encoded=>{
    const image=new Image();image.src=`data:image/png;base64,${encoded}`;await image.decode()
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height
    const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0)
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data
    let black=0,mean=0,deskBlack=0,deskPixels=0
    for(let i=0;i<data.length;i+=4){const y=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];mean+=y;if(y<12)black++;const row=Math.floor(i/4/canvas.width);if(row>canvas.height*.43&&row<canvas.height*.83){deskPixels++;if(y<12)deskBlack++}}
    return {black:black/(data.length/4),mean:mean/(data.length/4),deskBlack:deskBlack/Math.max(1,deskPixels)}
  },shot.toString('base64'))
}

test('real WebGL lamp toggles, hover and drag do not produce black frame spikes',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/');const stage=page.locator('.studio-stage'),host=page.locator('.studio-render'),canvas=host.locator('canvas')
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:120_000})
  await page.waitForTimeout(1800)
  const capture=async(name:string)=>{const shot=await canvas.screenshot({timeout:30_000,path:info.outputPath(`${name}.png`)});return luminance(page,shot)}
  const original=await capture('initial')
  expect(original.mean).toBeGreaterThan(25)
  // The original model's shade center projects to this region of the 3:2 frame.
  let lamp:{x:number;y:number}|undefined
  for(const [x,y] of [[310,235],[330,235],[295,225],[320,215],[340,260]]){
    await page.mouse.move(x,y);await page.waitForTimeout(350)
    if((await page.locator('.studio-object-tooltip').textContent())?.includes('Lamp')){lamp={x,y};break}
  }
  expect(lamp,'visible lamp should be raycast-clickable').toBeTruthy()
  await page.waitForTimeout(600)
  const baseline=await capture('lamp-hover')
  const frames=[baseline]
  for(const state of ['off','on','off','on']){
    await page.mouse.click(lamp!.x,lamp!.y)
    await expect(host).toHaveAttribute('data-lamp-state',state,{timeout:15_000})
    frames.push(await capture(`lamp-${state}-${frames.length}`))
    await expect(host).toHaveAttribute('data-lamp-settled','true',{timeout:15_000})
    frames.push(await capture(`lamp-${state}-settled-${frames.length}`))
  }
  for(const [x,y] of [[480,410],[650,420],[200,420],[480,260],[850,350]]){
    await page.mouse.move(x,y);frames.push(await capture(`hover-${frames.length}`))
  }
  await page.mouse.move(480,500);await page.mouse.down();await page.mouse.move(650,490,{steps:5});await page.mouse.up()
  frames.push(await capture('drag'))
  for(const frame of frames){expect(frame.mean).toBeGreaterThan(original.mean*.70);expect(frame.black).toBeLessThan(original.black+.035);expect(frame.deskBlack).toBeLessThan(original.deskBlack+.025)}
  expect(errors).toEqual([])
})

test('portrait starts on desk detail and pans without losing WebGL',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/')
  const stage=page.locator('.studio-stage'),canvas=page.locator('.studio-render canvas')
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:120_000});await page.waitForTimeout(1000)
  await canvas.screenshot({path:info.outputPath('mobile-center.png')})
  await page.mouse.move(200,450);await page.mouse.down();await page.mouse.move(360,450,{steps:5});await page.mouse.up();await page.waitForTimeout(500)
  await canvas.screenshot({path:info.outputPath('mobile-left.png')})
  await page.mouse.move(350,450);await page.mouse.down();await page.mouse.move(15,450,{steps:6});await page.mouse.up();await page.waitForTimeout(500)
  await canvas.screenshot({path:info.outputPath('mobile-right.png')});await expect(stage).toHaveAttribute('data-status','ready')
})
