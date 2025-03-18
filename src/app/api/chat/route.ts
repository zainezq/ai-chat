export async function POST(req: Request) {
    const { message } = await req.json();
    const reply = `You said: ${message}`;
    return Response.json({ reply });
  }
  