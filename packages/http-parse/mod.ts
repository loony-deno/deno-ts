interface ParsedHttpRequest {
  method: string;
  path: string;
  protocol: string;
  headers: Record<string, string>;
  cookies?: Record<string, string>;
  body?: string;
}

function parseHttpRequest(httpRequest: string): ParsedHttpRequest {
  const [requestLine, ...lines] = httpRequest.trim().split("\r\n");
  const [method, path, protocol] = requestLine.split(" ");

  const headers: Record<string, string> = {};
  let cookies: Record<string, string> | undefined;
  let body: string | undefined;

  let isBody = false;
  for (const line of lines) {
    if (isBody) {
      body = (body ?? "") + line + "\n";
      continue;
    }
    if (line === "") {
      isBody = true;
      continue;
    }
    const [key, ...valueParts] = line.split(": ");
    if (!key || valueParts.length === 0) continue;
    const value = valueParts.join(": ");
    headers[key] = value;
  }

  if (headers["Cookie"]) {
    cookies = Object.fromEntries(
      headers["Cookie"]
        .split("; ")
        .map((cookie) => cookie.split("=").map(decodeURIComponent))
    );
  }

  return { method, path, protocol, headers, cookies, body: body?.trim() };
}

const httpString = `POST /submit HTTP/1.1\r\n
    Host: example.com\r\n
    Connection: keep-alive\r\n
    Content-Type: application/json\r\n
    Content-Length: 27\r\n\r\n
    {"username":"test","password":"1234"}`;

console.log(parseHttpRequest(httpString));
