from fastapi import Request

async def get_ip_address(request: Request) -> str:
    """
    Get the IP address of the client.
    """
    # Get IP from X-Forwarded-For header or fall back to client IP
    forwarded_for = request.headers.get("x-forwarded-for")
    print(forwarded_for)
    client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.client.host
    print(client_ip)
    # Handle both IPv4 and IPv6 addresses
    if ":" in client_ip:
        # For IPv6, remove port if present (last colon and everything after it)
        if client_ip.count(":") > 1:  # This is an IPv6 address
            if "]" in client_ip:  # IPv6 with port (e.g., [2001:db8::1]:8080)
                client_ip = client_ip.split("]")[0].split("[")[1]
            else:  # IPv6 without port
                client_ip = client_ip
        else:  # IPv4 with port
            client_ip = client_ip.split(":")[0]
    print(client_ip)
    return client_ip
