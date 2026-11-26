using System;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;

namespace BeneficiaryDashboards
{
    public sealed class MvcApplication : HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            GlobalFilters.Filters.Add(new HandleErrorAttribute());
            RouteConfig.RegisterRoutes(RouteTable.Routes);
        }

        protected void Application_BeginRequest(object sender, EventArgs e)
        {
            Response.Headers["X-Content-Type-Options"] = "nosniff";
            Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
            Response.Headers["Referrer-Policy"] = "same-origin";
            Response.Headers["Content-Security-Policy"] =
                "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'";
        }
    }
}
