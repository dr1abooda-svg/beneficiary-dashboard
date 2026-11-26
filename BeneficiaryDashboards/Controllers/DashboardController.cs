using System;
using System.Diagnostics;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Web.Mvc;
using BeneficiaryDashboards.Services;

namespace BeneficiaryDashboards.Controllers
{
    [Authorize]
    public sealed class DashboardController : Controller
    {
        private readonly DashboardRepository _repository = new DashboardRepository();

        protected override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            Response.Cache.SetCacheability(System.Web.HttpCacheability.NoCache);
            Response.Cache.SetNoStore();
            base.OnActionExecuting(filterContext);
        }

        [HttpGet]
        public ActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public ActionResult Options()
        {
            try
            {
                return Json(_repository.GetOptions(), JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                Trace.TraceError("Dashboard options failure: " + ex.GetType().Name);
                Response.StatusCode = 500;
                Response.TrySkipIisCustomErrors = true;
                return Json(new { Error = "تعذر قراءة خيارات التصفية من قاعدة البيانات." }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public ActionResult Snapshot(string month, int? channelId, int? regionId, int? serviceId)
        {
            // A single calendar month, without guessing values or a default period.
            if (string.IsNullOrEmpty(month) || !Regex.IsMatch(month, @"\A\d{4}-(0[1-9]|1[0-2])\z"))
                return BadRequest("يجب تحديد الشهر بصيغة YYYY-MM.");

            DateTime monthStart;
            if (!DateTime.TryParseExact(month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out monthStart) || monthStart.Year < 1753 || monthStart.Year >= 9999)
                return BadRequest("الشهر المحدد خارج نطاق تاريخ SQL Server.");
            if (!ModelState.IsValid || channelId < 0 || regionId < 0 || serviceId < 0)
                return BadRequest("قيم عوامل التصفية غير صحيحة.");

            try
            {
                var result = _repository.GetSnapshot(monthStart, channelId, regionId, serviceId);
                return Json(result, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                Trace.TraceError("Dashboard snapshot failure: " + ex.GetType().Name);
                Response.StatusCode = 500;
                Response.TrySkipIisCustomErrors = true;
                return Json(new { Error = "تعذر استرجاع بيانات اللوحة. راجع الاتصال وصلاحيات القراءة." },
                    JsonRequestBehavior.AllowGet);
            }
        }

        private ActionResult BadRequest(string message)
        {
            Response.StatusCode = 400;
            Response.TrySkipIisCustomErrors = true;
            return Json(new { Error = message }, JsonRequestBehavior.AllowGet);
        }
    }
}
